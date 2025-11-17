"""
server.py

Flask API for:
 - receiving training groups (audio files + metadata JSON) from the website
 - saving files into the sound_matcher expected structure
 - updating profile index files
 - retraining the model for a user
 - lightweight status + management endpoints

Usage:
    python3 server.py

Notes:
 - This expects sound_matcher.py to be in the same folder and expose:
     * normalize_text(user: str) -> str
     * load_profile(user: str) -> dict
     * save_profile(user: str, prof: dict) -> None
     * train_model(user: str) -> None
     * AUDIO_DIR (Path)
 - Adjust BASE_DIR and STATUS_FILE paths if you want them somewhere else.
 - This is designed to be very lightweight on the Pi.
"""

from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from pathlib import Path
import os
import json
import traceback
import time

# import your existing ML module (the large script you pasted)
import sound_matcher as sm

app = Flask(__name__)

# ========== Configuration ==========
# Base where groups/profiles will be stored. Matches sound_matcher.DATA_DIR structure.
BASE_DIR = Path(sm.DATA_DIR)              # e.g., sound_profiles/
AUDIO_DIR = Path(sm.AUDIO_DIR)            # sound_profiles/audio/
INDEX_DIR = Path(sm.INDEX_DIR)            # sound_profiles/indices/
MODEL_DIR = Path(sm.MODEL_DIR)            # sound_profiles/models/

# status text file (website & LED read this)
STATUS_FILE = Path("/home/pi/status.txt") if Path("/home/pi").exists() else Path("status.txt")

# Allowed audio extensions
ALLOWED_AUDIO_EXTS = {".wav", ".flac", ".mp3", ".ogg", ".m4a"}

# Ensure folders exist
BASE_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
INDEX_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)


# ========== Utility helpers ==========
def set_status(msg: str) -> None:
    """Write a short status string to STATUS_FILE (also print)."""
    try:
        STATUS_FILE.write_text(msg)
    except Exception:
        # best-effort: print stack if we can't write
        print("Could not write status:", traceback.format_exc())
    print("[STATUS]", msg)


def is_audio_filename_ok(name: str) -> bool:
    ext = Path(name).suffix.lower()
    return ext in ALLOWED_AUDIO_EXTS


def safe_save_file(file_storage, dest_path: Path) -> None:
    """Save a Werkzeug FileStorage to dest_path (Path)."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    file_storage.save(str(dest_path))


# ========== API Endpoints ==========

@app.route("/upload_profile_group", methods=["POST"])
def upload_profile_group():
    """
    Accepts a multipart/form-data POST with:
      - form field 'user' (string) - required
      - form field 'group_name' (string) - optional (will be used as label/group)
      - form field 'metadata' (optional JSON string) - extra info
      - one or more file fields named 'audio_files' (the actual audio)
    The route will:
      - save audio files to AUDIO_DIR/<user>/<label>/
      - add entries to the user's index JSON (INDEX_DIR/<user>.json)
      - call train_model(user) after saving files
    """
    try:
        # Basic params
        user_raw = request.form.get("user", "").strip()
        if not user_raw:
            set_status("ERROR: Missing 'user' in form")
            return jsonify({"error": "Missing 'user' form field"}), 400
        user = sm.normalize_text(user_raw)

        group_name_raw = request.form.get("group_name", "").strip() or "default"
        label = sm.normalize_text(group_name_raw)

        metadata_raw = request.form.get("metadata", "")
        metadata = {}
        if metadata_raw:
            try:
                metadata = json.loads(metadata_raw)
            except Exception:
                # ignore metadata parsing errors, continue with empty metadata
                metadata = {"_raw": metadata_raw}

        uploaded_files = request.files.getlist("audio_files")
        if not uploaded_files:
            set_status("ERROR: No audio files uploaded")
            return jsonify({"error": "No audio_files in request"}), 400

        # Load existing profile index for user
        prof = sm.load_profile(user)
        examples = prof.get("examples", []) or []

        # Save each uploaded file into AUDIO_DIR/<user>/<label>/
        stash_dir = AUDIO_DIR / user / label
        stash_dir.mkdir(parents=True, exist_ok=True)

        saved = []
        for f in uploaded_files:
            filename = secure_filename(f.filename or "")
            if not filename:
                # skip empty filenames
                continue
            if not is_audio_filename_ok(filename):
                # skip unsupported ext (or optionally convert later)
                continue

            # determine next filename index
            next_idx = len(list(stash_dir.glob("*.wav"))) + 1
            # always save as wav if source is wav; otherwise keep filename extension
            dest = stash_dir / f"{next_idx:03d}{Path(filename).suffix.lower()}"
            safe_save_file(f, dest)

            # record in profile examples; label is the group label
            examples.append({"path": str(dest), "label": label})
            saved.append(str(dest))

        prof["examples"] = examples
        sm.save_profile(user, prof)

        # Optionally write per-group metadata file
        try:
            meta_path = stash_dir / "metadata.json"
            meta_blob = {
                "uploaded_at": time.time(),
                "uploader_user_field": user_raw,
                "group_name": group_name_raw,
                "metadata": metadata,
                "saved_files": saved
            }
            meta_path.write_text(json.dumps(meta_blob, indent=2))
        except Exception:
            # not critical
            pass

        # Train the model for this user (best-effort)
        try:
            set_status(f"TRAINING:{user}")
            sm.train_model(user)
            set_status("OK")
        except Exception as e:
            set_status(f"ERROR: training failed: {e}")
            # return success with training failure detail (so uploader sees it)
            return jsonify({
                "message": "Files saved",
                "saved_files": saved,
                "train_error": str(e)
            }), 200

        return jsonify({"message": "Files saved and model retrained", "saved_files": saved}), 200

    except Exception as exc:
        set_status(f"ERROR: {str(exc)}")
        traceback.print_exc()
        return jsonify({"error": str(exc)}), 500


@app.route("/train_user", methods=["POST"])
def train_user_endpoint():
    """
    Trigger retrain manually:
      POST JSON body: {"user": "alice"}
    """
    try:
        j = request.get_json(force=True, silent=True) or {}
        user_raw = j.get("user") or request.form.get("user")
        if not user_raw:
            return jsonify({"error": "Missing 'user' parameter"}), 400
        user = sm.normalize_text(user_raw)
        set_status(f"TRAINING:{user}")
        sm.train_model(user)
        set_status("OK")
        return jsonify({"message": "Training complete"}), 200
    except Exception as e:
        set_status(f"ERROR: training failed: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


@app.route("/status", methods=["GET"])
def get_status():
    """Return the current status text (short string)."""
    try:
        if STATUS_FILE.exists():
            content = STATUS_FILE.read_text().strip()
        else:
            content = "NO_STATUS"  # or "OK"
        return jsonify({"status": content}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/list_users", methods=["GET"])
def list_users():
    """
    Return a list of users that have profile index files in INDEX_DIR.
    Useful for the website to populate a dropdown.
    """
    try:
        users = []
        for p in INDEX_DIR.glob("*.json"):
            users.append(p.stem)
        return jsonify({"users": sorted(users)}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/list_labels", methods=["GET"])
def list_labels():
    """
    Query labels/commands for a user:
      GET /list_labels?user=alice
    """
    try:
        user_raw = request.args.get("user", "")
        if not user_raw:
            return jsonify({"error": "Missing user parameter"}), 400
        user = sm.normalize_text(user_raw)
        prof = sm.load_profile(user)
        labels = sorted(set(ex["label"] for ex in prof.get("examples", [])))
        return jsonify({"labels": labels}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/delete_group", methods=["POST"])
def delete_group():
    """
    Delete a specific group/label for a user:
      POST JSON: {"user": "alice", "label": "greeting"}
    This:
      - removes files under AUDIO_DIR/<user>/<label>/
      - removes examples from the index for that label
      - optionally retrains the model
    """
    try:
        payload = request.get_json(force=True, silent=True) or {}
        user_raw = payload.get("user")
        label_raw = payload.get("label")
        if not user_raw or not label_raw:
            return jsonify({"error": "Missing 'user' or 'label' in JSON body"}), 400
        user = sm.normalize_text(user_raw)
        label = sm.normalize_text(label_raw)

        target_dir = AUDIO_DIR / user / label
        if not target_dir.exists():
            return jsonify({"error": "Group not found"}), 404

        # remove files
        for p in target_dir.glob("*"):
            try:
                p.unlink()
            except Exception:
                pass
        try:
            target_dir.rmdir()
        except Exception:
            # if folder not empty or other error, ignore
            pass

        # update profile index: remove examples with that label
        prof = sm.load_profile(user)
        examples = [ex for ex in prof.get("examples", []) if ex.get("label") != label]
        prof["examples"] = examples
        sm.save_profile(user, prof)

        # retrain model (best-effort)
        try:
            set_status(f"TRAINING:{user}")
            sm.train_model(user)
            set_status("OK")
        except Exception as e:
            set_status(f"ERROR: retrain failed: {e}")
            return jsonify({"message": "group deleted", "retrain_error": str(e)}), 200

        return jsonify({"message": "group deleted and model retrained"}), 200

    except Exception as e:
        set_status(f"ERROR: {e}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ========== Lightweight health endpoint ==========
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"ok": True}), 200


# ========== Start server ==========
if __name__ == "__main__":
    # If you want to run on a different port, change below; default set to 8080 for parity
    app.run(host="0.0.0.0", port=8080)
