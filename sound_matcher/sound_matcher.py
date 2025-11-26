import json
from pathlib import Path
from typing import Dict, List, Optional

import numpy as np
import sounddevice as sd
import soundfile as sf
import librosa
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib

# ===== Terminal colours =====
B = "\033[1m"
R = "\033[0m"
G = "\033[92m"
Y = "\033[93m"
C = "\033[96m"

# ===== Audio & model settings =====
SAMPLE_RATE = 16000
CHANNELS = 1
REC_LEN_SEC = 3.0        # window length for commands
RMS_GATE = 0.001         # permissive gate; adjust if needed

ENROLL_SAMPLES = 10      # mic recordings per command

# RandomForest settings
N_TREES = 200
MAX_DEPTH = None
RANDOM_STATE = 0

# Decision thresholds
MIN_PROBA = 0.60         # minimum probability for top class
MARGIN_PROBA = 0.15      # top1 - top2 must be at least this, else UNKNOWN

# Storage
DATA_DIR = Path("sound_profiles")
AUDIO_DIR = DATA_DIR / "audio"
INDEX_DIR = DATA_DIR / "indices"
MODEL_DIR = DATA_DIR / "models"
AUDIO_DIR.mkdir(parents=True, exist_ok=True)
INDEX_DIR.mkdir(parents=True, exist_ok=True)
MODEL_DIR.mkdir(parents=True, exist_ok=True)


# ===== Helpers =====
def normalize_text(s: str) -> str:
    s = (s or "").lower().strip()
    keep = "abcdefghijklmnopqrstuvwxyz0123456789_"
    s = "".join(ch if ch in keep else "_" for ch in s)
    s = "_".join(part for part in s.split("_") if part)
    return s or "default"


def profile_path(user: str) -> Path:
    return INDEX_DIR / f"{user}.json"


def model_path(user: str) -> Path:
    return MODEL_DIR / f"{user}_rf.joblib"


def load_profile(user: str) -> dict:
    p = profile_path(user)
    if p.exists():
        prof = json.loads(p.read_text())
    else:
        prof = {}

    # ensure keys exist
    prof.setdefault("examples", [])        # list[{"path","label"}]
    prof.setdefault("scripts", {})         # dict[label -> script_id]
    return prof


def save_profile(user: str, prof: dict) -> None:
    profile_path(user).write_text(json.dumps(prof, indent=2))


def rms(y: np.ndarray) -> float:
    y = y.astype(np.float32)
    return float(np.sqrt(np.mean(y * y))) if y.size else 0.0


def record_block(seconds: float) -> np.ndarray:
    sd.default.samplerate = SAMPLE_RATE
    sd.default.channels = CHANNELS
    data = sd.rec(int(seconds * SAMPLE_RATE), dtype="float32")
    sd.wait()
    return data.squeeze()


def read_wav(path: Path) -> np.ndarray:
    y, sr = sf.read(str(path), dtype="float32", always_2d=False)
    if y.ndim > 1:
        y = y[:, 0]
    if sr != SAMPLE_RATE:
        y = librosa.resample(y, orig_sr=sr, target_sr=SAMPLE_RATE)
    return y.astype(np.float32)


def preprocess_audio(y: np.ndarray) -> np.ndarray:
    if y.size == 0:
        return y

    # trim silence
    y, _ = librosa.effects.trim(y, top_db=30)
    if y.size == 0:
        return y

    # peak normalize
    peak = np.max(np.abs(y))
    if peak > 1e-6:
        y = y / peak

    # duration control
    target_len = int(REC_LEN_SEC * SAMPLE_RATE)
    if len(y) < target_len:
        y = np.pad(y, (0, target_len - len(y)))
    if len(y) > target_len:
        y = y[:target_len]

    return y.astype(np.float32)


def extract_features_from_audio(y: np.ndarray) -> np.ndarray:
    """
    Extract MFCC + delta statistics → fixed-length feature vector.
    """
    y = preprocess_audio(y)
    if y.size == 0:
        return np.zeros(80, dtype=np.float32)

    n_mfcc = 20
    mfcc = librosa.feature.mfcc(y=y, sr=SAMPLE_RATE, n_mfcc=n_mfcc)
    delta = librosa.feature.delta(mfcc)

    feats = np.concatenate(
        [
            mfcc.mean(axis=1),
            mfcc.std(axis=1),
            delta.mean(axis=1),
            delta.std(axis=1),
        ]
    )
    return feats.astype(np.float32)


def extract_features_from_path(path: Path) -> np.ndarray:
    y = read_wav(path)
    return extract_features_from_audio(y)


# ===== Model training & prediction =====
def train_model(user: str) -> None:
    user = normalize_text(user)
    prof = load_profile(user)
    examples = prof.get("examples", [])

    if len(examples) < 2:
        print(Y + "Not enough examples to train a model (need ≥ 2)." + R)
        return

    X_list: List[np.ndarray] = []
    y_list: List[str] = []

    print(C + f"Training RandomForest for user '{user}' on {len(examples)} samples…" + R)

    for ex in examples:
        p = Path(ex["path"])
        lbl = ex["label"]
        if not p.exists():
            continue
        feats = extract_features_from_path(p)
        X_list.append(feats)
        y_list.append(lbl)

    if len(X_list) < 2:
        print(Y + "Not enough valid audio files to train." + R)
        return

    X = np.vstack(X_list)
    labels = np.array(y_list)

    le = LabelEncoder()
    y_enc = le.fit_transform(labels)

    clf = RandomForestClassifier(
        n_estimators=N_TREES,
        max_depth=MAX_DEPTH,
        class_weight="balanced",
        random_state=RANDOM_STATE,
    )
    clf.fit(X, y_enc)

    joblib.dump({"model": clf, "label_encoder": le}, model_path(user))
    print(G + "Model trained and saved." + R)


def load_model(user: str):
    user = normalize_text(user)
    path = model_path(user)
    if not path.exists():
        return None
    return joblib.load(path)


def rf_predict_proba(user: str, y_audio: np.ndarray):
    bundle = load_model(user)
    if bundle is None:
        return None, None, None
    clf: RandomForestClassifier = bundle["model"]
    le: LabelEncoder = bundle["label_encoder"]

    feats = extract_features_from_audio(y_audio).reshape(1, -1)
    proba = clf.predict_proba(feats)[0]  # shape (n_classes,)
    classes = le.inverse_transform(np.arange(len(proba)))
    return classes, proba, bundle


def decide_from_proba(classes: np.ndarray, proba: np.ndarray) -> str:
    if classes is None or proba is None or len(proba) == 0:
        return "UNKNOWN"
    idx_sorted = np.argsort(proba)[::-1]
    top1 = idx_sorted[0]
    label1 = classes[top1]
    p1 = float(proba[top1])
    if len(proba) > 1:
        p2 = float(proba[idx_sorted[1]])
    else:
        p2 = 0.0

    if p1 >= MIN_PROBA and (p1 - p2) >= MARGIN_PROBA:
        return str(label1)
    return "UNKNOWN"


# ===== Enrollment logic (with script_id) =====
def enroll_from_mic(user: str, label: str, script_id: str) -> None:
    """
    Record ENROLL_SAMPLES clips from the mic for a label,
    store them, store script_id for that label, then train.
    """
    user = normalize_text(user)
    label = normalize_text(label)
    script_id = script_id.strip()

    prof = load_profile(user)
    examples = prof["examples"]
    scripts = prof["scripts"]

    # store/overwrite script_id for this label
    scripts[label] = script_id

    stash_dir = AUDIO_DIR / user / label
    stash_dir.mkdir(parents=True, exist_ok=True)

    print(
        C
        + f"\nRecording {ENROLL_SAMPLES} samples for '{label}'.\n"
        + "Press ENTER before each sample, then speak the command.\n"
        + R
    )

    for i in range(ENROLL_SAMPLES):
        input(f"Sample {i+1}/{ENROLL_SAMPLES} – press ENTER, then speak...")
        y = record_block(REC_LEN_SEC)
        val = rms(y)
        print(f"   rms={val:.5f}")
        if val < RMS_GATE:
            print(Y + "   Too quiet; sample kept anyway for now." + R)

        fname = stash_dir / f"{len(list(stash_dir.glob('*.wav'))) + 1:03d}.wav"
        sf.write(str(fname), y, SAMPLE_RATE)
        examples.append({"path": str(fname), "label": label})

    prof["examples"] = examples
    prof["scripts"] = scripts
    save_profile(user, prof)
    train_model(user)


def enroll_from_dir(user: str, label: str, script_id: str, dir_path: Path) -> None:
    """
    Enroll a label using existing WAV files from a folder,
    and store script_id for that label.
    """
    user = normalize_text(user)
    label = normalize_text(label)
    script_id = script_id.strip()

    prof = load_profile(user)
    examples = prof["examples"]
    scripts = prof["scripts"]

    # store/overwrite script_id for this label
    scripts[label] = script_id

    wavs = sorted(p for p in dir_path.glob("*.wav") if p.is_file())
    if not wavs:
        print(Y + "No WAV files found in that folder." + R)
        return

    print(C + f"Adding {len(wavs)} files for label '{label}'…" + R)

    # FIXED: Just add references to existing files, don't copy them
    for w in wavs:
        # Use the existing file path, don't create a new one
        examples.append({"path": str(w), "label": label})
        print(f"  Added: {w.name}")

    prof["examples"] = examples
    prof["scripts"] = scripts
    save_profile(user, prof)
    train_model(user)


# ===== Prediction & push-to-talk listening =====
def predict_from_file(user: str, wav_path: Path) -> None:
    user = normalize_text(user)
    if not wav_path.exists():
        print(Y + "File does not exist." + R)
        return

    prof = load_profile(user)
    scripts = prof["scripts"]

    y = read_wav(wav_path)
    val = rms(y)
    print(f"rms={val:.5f}")

    classes, proba, _ = rf_predict_proba(user, y)
    if classes is None:
        print(Y + "No model trained yet for this user. Enroll some commands first." + R)
        return

    decision = decide_from_proba(classes, proba)
    print(B + "Probabilities:" + R)
    for c, p in sorted(zip(classes, proba), key=lambda x: x[1], reverse=True):
        sid = scripts.get(c, "")
        label_display = f"{c} (script_id={sid})" if sid else c
        print(f"  {label_display:25s} {p:.3f}")

    if decision != "UNKNOWN":
        script_id = scripts.get(decision, "")
        if script_id:
            print(G + f"DECISION: {decision}  (script_id={script_id})" + R)
        else:
            print(G + f"DECISION: {decision}" + R)
    else:
        print(Y + "DECISION: UNKNOWN" + R)


def listen_once(user: str) -> None:
    """
    Push-to-talk: wait for ENTER, record one window, classify once,
    then return to the main menu. Also shows script_id.
    """
    user = normalize_text(user)
    bundle = load_model(user)
    if bundle is None:
        print(Y + "No model trained yet for this user. Enroll some commands first." + R)
        return

    prof = load_profile(user)
    scripts = prof["scripts"]

    print(C + "\nPush-to-talk mode\n" + R)
    print("When you're ready:")
    print("  - Press ENTER to start listening")
    print(f"  - Speak your command (recording lasts ~{REC_LEN_SEC:.1f} seconds)")
    print("  - Then wait for the result\n")

    input("Press ENTER to record...")
    sd.default.samplerate = SAMPLE_RATE
    sd.default.channels = CHANNELS

    block = sd.rec(int(REC_LEN_SEC * SAMPLE_RATE), dtype="float32")
    sd.wait()
    y = block.squeeze()
    val = rms(y)
    print(f"rms={val:.5f}")

    if val < RMS_GATE:
        print(Y + "Too quiet; no command recognized." + R)
        return

    classes, proba, _ = rf_predict_proba(user, y)
    if classes is None:
        print(Y + "Model disappeared; try re-training." + R)
        return

    decision = decide_from_proba(classes, proba)

    print(B + "Probabilities:" + R)
    for c, p in sorted(zip(classes, proba), key=lambda x: x[1], reverse=True):
        sid = scripts.get(c, "")
        label_display = f"{c} (script_id={sid})" if sid else c
        print(f"  {label_display:25s} {p:.3f}")

    if decision != "UNKNOWN":
        script_id = scripts.get(decision, "")
        if script_id:
            print(G + f"\n[DETECTED] {decision} (script_id={script_id})" + R)
        else:
            print(G + f"\n[DETECTED] {decision}" + R)
    else:
        print(Y + "\nNo confident command recognized (UNKNOWN)." + R)


def list_labels(user: str) -> None:
    user = normalize_text(user)
    prof = load_profile(user)
    examples = prof["examples"]
    scripts = prof["scripts"]

    labels = sorted(set(ex["label"] for ex in examples))
    if not labels:
        print(Y + "No commands enrolled yet." + R)
        return

    print(B + "Commands for this user:" + R)
    for lbl in labels:
        n = sum(1 for ex in examples if ex["label"] == lbl)
        sid = scripts.get(lbl, "")
        extra = f" (script_id={sid})" if sid else ""
        print(f"  - {lbl}  ({n} samples){extra}")


def reset_user(user: str) -> None:
    user = normalize_text(user)
    p = profile_path(user)
    if p.exists():
        p.unlink()

    m = model_path(user)
    if m.exists():
        m.unlink()

    d = AUDIO_DIR / user
    if d.exists():
        for f in d.rglob("*"):
            try:
                f.unlink()
            except OSError:
                pass
        try:
            d.rmdir()
        except OSError:
            pass

    print(G + f"Reset profile for '{user}'." + R)


# ===== Menu =====
def main() -> None:
    print(B + "\nSound Matcher Demo (librosa + RandomForest)" + R)
    print("Push-to-talk: press ENTER to record, classify once, then return.\n")
    user = input("Profile name (e.g., alice): ").strip() or "demo_user"
    user = normalize_text(user)

    while True:
        print("\n" + B + "Choose:" + R)
        print("  1) Create a command by recording with microphone")
        print("  2) Create a command from folder of WAVs")
        print("  3) Predict from one WAV file")
        print("  4) Listen once (press ENTER to talk)")
        print("  5) List commands")
        print("  6) Reset this user")
        print("  7) Quit")
        choice = input("> ").strip()

        if choice == "1":
            lbl = input("Command name (e.g., lights_on): ").strip()
            script_id = input("Script ID for this command: ").strip()
            enroll_from_mic(user, lbl, script_id)
        elif choice == "2":
            lbl = input("Command name (e.g., lights_on): ").strip()
            script_id = input("Script ID for this command: ").strip()
            folder = input("Folder with WAVs (~10): ").strip()
            enroll_from_dir(user, lbl, script_id, Path(folder))
        elif choice == "3":
            path = input("Path to WAV file: ").strip()
            predict_from_file(user, Path(path))
        elif choice == "4":
            listen_once(user)
        elif choice == "5":
            list_labels(user)
        elif choice == "6":
            reset_user(user)
        elif choice == "7":
            print("Bye!")
            break
        else:
            print(Y + "Enter 1–7." + R)


if __name__ == "__main__":
    main()
