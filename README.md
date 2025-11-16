# GNG_VoiceAsisstant
Project Repository for the Voice Recognition Assistant


# 🎧 Sound Matcher Demo

A simple push-to-talk audio command recognizer.
You can train custom commands using microphone recordings or WAV files, then trigger them by pressing ENTER and speaking once.

---

# 📦 Install

### 1. Create and activate a virtual environment

**Windows (Git Bash):**

```bash
python -m venv .venv
source .venv/Scripts/activate
```

**Windows (PowerShell):**

```bash
python -m venv .venv
.venv\Scripts\activate
```

**macOS / Linux:**

```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

---

# ▶️ Run

```bash
python sound_matcher_demo.py
```

You will be asked to enter a **profile name**.
Each profile has its own commands and training data.

---

# 🎮 How to Use

After running the program, select one of the options:

### **1) Create a command by recording with microphone**

* Enter a command name (example: `hello`)
* You will record 10 samples
* Press ENTER → speak
* After recording all samples, the system trains automatically

### **2) Create a command from folder of WAVs**

* Put ~10 WAV files in a folder
* Enter the folder path
* They are imported and used to train the model

### **3) Predict from one WAV file**

* Enter the path to a WAV
* The program shows the predicted command

### **4) Listen once (press ENTER to talk)**

Push-to-talk mode:

* Press ENTER
* Speak your sound or phrase
* The program listens for ~3 seconds, predicts once, then stops
* It shows either the detected command or “UNKNOWN”

### **5) List commands**

Shows all commands trained for this profile.

### **6) Reset this user**

Deletes all recorded audio and the trained model.

### **7) Quit**

Exit the program.
