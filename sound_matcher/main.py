# Setup
# pip install tensorflow tensorflow-hub librosa sounddevice scikit-learn keyboard numpy




import os
import time
import numpy as np
import sounddevice as sd
import keyboard
import tensorflow as tf
import tensorflow_hub as hub
import librosa
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib
import pickle

SAMPLE_RATE = 16000
DATA_DIR = "yamnet_commands"
MODEL_PATH = "yamnet_command_model.pkl"

# Load YAMNet model from TensorFlow Hub
print("Loading YAMNet model (this may take a few seconds)...")
yamnet_model = hub.load("https://tfhub.dev/google/yamnet/1")

# Global variables
X, y = [], []
label_encoder = LabelEncoder()
classifier = None


def record_press_hold(key='space'):
    """Record audio while the key is held down."""
    print(f"Press and hold '{key}' to record...")
    audio_buffer = []
    while not keyboard.is_pressed(key):
        time.sleep(0.01)

    print("Recording...")
    while keyboard.is_pressed(key):
        chunk = sd.rec(int(0.1 * SAMPLE_RATE), samplerate=SAMPLE_RATE, channels=1, dtype='float32')
        sd.wait()
        audio_buffer.append(chunk.flatten())

    print("Recording stopped.")
    audio = np.concatenate(audio_buffer)
    return audio


def extract_yamnet_embedding(audio):
    """Get 1024-length YAMNet embedding from audio."""
    if len(audio) == 0:
        return None
    waveform = np.array(audio, dtype=np.float32)
    waveform = waveform / np.max(np.abs(waveform))  # normalize
    scores, embeddings, spectrogram = yamnet_model(waveform)
    return np.mean(embeddings.numpy(), axis=0)  # average over time


def save_audio_embedding(command_name, embedding):
    os.makedirs(DATA_DIR, exist_ok=True)
    command_dir = os.path.join(DATA_DIR, command_name)
    os.makedirs(command_dir, exist_ok=True)
    np.save(os.path.join(command_dir, f"{time.time()}.npy"), embedding)


def load_dataset():
    """Load all stored embeddings from disk."""
    X, y = [], []
    if not os.path.exists(DATA_DIR):
        return np.array([]), np.array([])
    for cmd in os.listdir(DATA_DIR):
        cmd_dir = os.path.join(DATA_DIR, cmd)
        for file in os.listdir(cmd_dir):
            if file.endswith(".npy"):
                emb = np.load(os.path.join(cmd_dir, file))
                X.append(emb)
                y.append(cmd)
    return np.array(X), np.array(y)


def train_model():
    global classifier, label_encoder, X, y
    X, y = load_dataset()
    if len(X) == 0:
        print("No training data found.")
        return
    label_encoder = LabelEncoder()
    y_encoded = label_encoder.fit_transform(y)
    classifier = RandomForestClassifier(n_estimators=200)
    classifier.fit(X, y_encoded)
    with open(MODEL_PATH, "wb") as f:
        pickle.dump((classifier, label_encoder), f)
    print(f"Model trained with {len(X)} samples across {len(set(y))} commands.")


def load_model():
    global classifier, label_encoder
    if os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            classifier, label_encoder = pickle.load(f)
        print("Loaded existing model.")
    else:
        print("No trained model found. Please train one first.")


def predict_command(audio):
    if classifier is None:
        print("No model loaded.")
        return
    emb = extract_yamnet_embedding(audio)
    if emb is None:
        print("No valid audio detected.")
        return
    pred = classifier.predict([emb])[0]
    command = label_encoder.inverse_transform([pred])[0]
    print(f"🔊 Detected command: {command}")


def menu():
    while True:
        print("\n=== Sound Command Recognizer ===")
        print("1. Record a new command sound")
        print("2. Train model")
        print("3. Load model")
        print("4. Listen for a command")
        print("5. Exit")

        choice = input("Select an option: ").strip()

        if choice == "1":
            cmd = input("Enter command name: ").strip().lower()
            for i in range(5):
                print(f"Recording sample {i+1}/5 for '{cmd}'...")
                audio = record_press_hold()
                emb = extract_yamnet_embedding(audio)
                if emb is not None:
                    save_audio_embedding(cmd, emb)
                    print("Sample saved.")
                else:
                    print("Invalid audio, skipping.")
            print(f"Finished recording samples for '{cmd}'.")
        elif choice == "2":
            train_model()
        elif choice == "3":
            load_model()
        elif choice == "4":
            print("Press and hold space to listen for a command...")
            audio = record_press_hold()
            predict_command(audio)
        elif choice == "5":
            print("Exiting...")
            break
        else:
            print("Invalid choice.")


if __name__ == "__main__":
    menu()
