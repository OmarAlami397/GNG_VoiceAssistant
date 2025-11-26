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
  //flag for duplicate script ID
  const [scriptIdExists, setScriptIdExists] = useState(false);
  //flag for empty script ID
  const [scriptIdEmpty, setScriptIdEmpty] = useState(false);
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
    const response = await fetch("http://localhost:3001/recordings");
    const allRecordings = await response.json();

    return allRecordings.some(recording =>
      recording.title.toLowerCase() === commandTitle.toLowerCase()
    );
  };

  //check if script ID already exists
  const checkScriptIdExists = async (scriptId) => {
    if (!scriptId.trim()) return false;
    
    const response = await fetch("http://localhost:3001/commands/check-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scriptId }),
    });
    const result = await response.json();
    return result.exists;
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

    // Check if script ID is empty
    if (!scriptId.trim()) {
      setScriptIdEmpty(true);
      return;
    }

    //check for duplicate command
    const commandExists = await checkCommandExists(title);
    if (commandExists) {
      setCommandExists(true);
      setRecordings([]);
      setCount(0);
      setInitialTitle("");
      setCompleted(false);
      return;
    }

    //check for duplicate script ID
    const scriptIdExists = await checkScriptIdExists(scriptId);
    if (scriptIdExists) {
      setScriptIdExists(true);
      return;
    }

    setCommandExists(false);
    setScriptIdExists(false);
    setScriptIdEmpty(false);

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
      scriptId: scriptId.trim()
    };

    await fetch("http://localhost:3001/recordings/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(completedCommand),
    });

    //upload to pi
    //await uploadGroupToPi(title, recordings);

    if (onComplete) onComplete(completedCommand);

    setRecordings([]);
    setScriptId("");
  }

  //auto-save when 10 recordings reached
  useEffect(() => {
    if (count === 10) {
      setCompleted(true);
      saveAllRecordings();
    }
  }, [count]);

  //reset script ID exists flag when script ID changes
  useEffect(() => {
    if (scriptIdExists || scriptIdEmpty) {
      setScriptIdExists(false);
      setScriptIdEmpty(false);
    }
  }, [scriptId]);

  //same with command
  useEffect(() => {
    if (commandExists) {
      setCommandExists(false);
    }
  }, [title]);

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

      <div className="script-id-container">
        <label htmlFor="scriptId" className="script-id-label">
          Script ID: *
        </label>
        <input
          id="scriptId"
          type="text"
          placeholder="Enter Script ID (required)"
          value={scriptId}
          onChange={(e) => setScriptId(e.target.value)}
          className="input-box script-id-input"
          required
        />
      </div>

      <button
        className={`record-button ${isRecording ? "active" : ""}`}
        onClick={handleRecord}
        disabled={scriptIdExists}
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

      {scriptIdExists && (
        <p style={{ color: "orange" }}>Script ID already exists</p>
      )}

      {scriptIdEmpty && (
        <p style={{ color: "red" }}>Script ID is required</p>
      )}
    </div>
  );
}