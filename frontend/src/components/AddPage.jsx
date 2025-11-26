import React, { useState, useEffect } from "react";
import { uploadGroupToPi } from "../backend/piApi.js";

export default function AddPage({ inputValue, setInputValue, onComplete }) {
  //current command title
  const [title, setTitle] = useState("");
  //original title when recording started
  const [initialTitle, setInitialTitle] = useState("");
  //track if currently recording
  const [isRecording, setIsRecording] = useState(false);
  //media recorder instance
  const [mediaRecorder, setMediaRecorder] = useState(null);
  //array of recorded audio data
  const [recordings, setRecordings] = useState([]);
  //number of recordings completed
  const [count, setCount] = useState(0);
  //track if all 10 recordings done
  const [completed, setCompleted] = useState(false);
  //flag for duplicate command
  const [commandExists, setCommandExists] = useState(false);
  //script ID input
  const [scriptId, setScriptId] = useState("");

  //sync title with input prop
  useEffect(() => {
    if (inputValue) {
      setTitle(inputValue);
      setInitialTitle(inputValue);
    }
  }, [inputValue]);

  //check if command name already in database
  const checkCommandExists = async (commandTitle) => {
    try {
      const response = await fetch("http://localhost:3001/recordings");
      const allRecordings = await response.json();

      return allRecordings.some(recording =>
        recording.title.toLowerCase() === commandTitle.toLowerCase()
      );
    } catch (error) {
      console.error("Error checking command:", error);
      return false;
    }
  };

  //reset recording progress
  const resetPage = () => {
    setRecordings([]);
    setCount(0);
    setInitialTitle("");
    setCompleted(false);
  };

  //handle record button click
  const handleRecord = async () => {
    if (!title.trim()) return;

    //check for duplicate command
    const exists = await checkCommandExists(title);
    if (exists) {
      setCommandExists(true);
      setRecordings([]);
      setCount(0);
      setInitialTitle("");
      setCompleted(false);
      return;
    }

    setCommandExists(false);

    if (initialTitle && title !== initialTitle) {
      setRecordings([]);
      setCount(0);
      setInitialTitle(title);
      setCompleted(false);
    }

    if (!initialTitle) setInitialTitle(title);

    if (!isRecording) {
      setIsRecording(true);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const reader = new FileReader();

        reader.onloadend = () => {
          const base64 = reader.result.split(",")[1];
          const version = count + 1;
          setRecordings((prev) => [...prev, { version, file_base64: base64 }]);
          setCount(version);
        };

        reader.readAsDataURL(blob);
      };

      recorder.start();
      setMediaRecorder(recorder);
    } else {
      setIsRecording(false);
      mediaRecorder.stop();
    }
  };

  //save all recordings to database
  const saveAllRecordings = async () => {
  const completedCommand = {
    title,
    recordings,
  };

  // FIXED: Pass the user's scriptId to upload function
  await uploadGroupToPi(title, recordings, scriptId, credentials);

  if (onComplete) onComplete(completedCommand);

  setRecordings([]);
  setScriptId(""); // Reset Script ID when recordings are done
};

  //auto-save when 10 recordings reached
  useEffect(() => {
    if (count === 10) {
      setCompleted(true);
      saveAllRecordings();
    }
  }, [count]);

  return (
    <div className="Enter add-page-container">
      <h1>Add Command</h1>

      <input
        className="input-box"
        type="text"
        placeholder="Command title"
        value={title}
        onChange={(e) => {
          const newTitle = e.target.value;
          if (initialTitle && newTitle !== initialTitle) {
            setRecordings([]);
            setCount(0);
            setInitialTitle("");
            setCompleted(false);
            setCommandExists(false);
          }
          setTitle(newTitle);
        }}
      />

      <button
        className={`record-button ${isRecording ? "active" : ""}`}
        onClick={handleRecord}
      >
        {isRecording ? "Stop Recording" : "Record"}
      </button>

      <p>{count}/10 recordings completed</p>

      {isRecording && <p style={{ color: "red" }}>Recording in progress...</p>}

      {completed && count === 10 && (
        <p style={{ color: "green" }}>All 10 recordings completed!</p>
      )}

      {commandExists && (
        <p style={{ color: "orange" }}>Command already exists</p>
      )}

{/*extra */}
      <div className="script-id-container">
        <label htmlFor="scriptId" className="script-id-label">
          Script ID:
        </label>
        <input
          id="scriptId"
          type="text"
          placeholder="Enter Script ID"
          value={scriptId}
          onChange={(e) => setScriptId(e.target.value)}
          className="input-box script-id-input"
        />
      </div>
    </div>
  );
}