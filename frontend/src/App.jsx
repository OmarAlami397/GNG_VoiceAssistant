import React, { useState } from "react";
import "./App.css";
import { FaHome, FaPlusCircle, FaEdit } from "react-icons/fa";

function App() {
  const [activePage, setActivePage] = useState("Home");
  const [inputValue, setInputValue] = useState("");
  const [isRecording, setIsRecording] = useState(false);

  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [recordings, setRecordings] = useState([]);

  const handleRecord = async () => {
    if (!isRecording) {
    
    setIsRecording(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);

        
        setRecordings((prev) => [...prev, { name: inputValue, audioURL: url }]);
      };

      recorder.start();
      setMediaRecorder(recorder);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Could not access microphone. Please allow microphone access.");
      setIsRecording(false);
    }
  } else {
    // Stop recording
    setIsRecording(false);
    if (mediaRecorder) {
      mediaRecorder.stop();
    }
  }
  };

  const renderContent = () => {
    switch (activePage) {
      case "Home":
        return (
          <div className="Enter">
            <h1>Enter A Command</h1>
            <p>homing</p>

            <input
              type="text"
              placeholder="type here"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="input-box"
            />
            <br/>
            <button
              className="enter-button"
              onClick={() => setActivePage("Add")}
            >
              Enter
            </button>
          </div>
        );

      case "Add":
        return (
          <div className="Enter">
            <h1>Add</h1>
            <p>adding</p>

            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="input-box"
            />
            <br/>

            <button
              className={`record-button ${isRecording ? "active-button" : ""}`}
              onClick={handleRecord}
            >
              {isRecording ? "Stop" : "Record"}
            </button>
             {isRecording && (
            <p style={{ color: "red", marginTop: "10px" }}>
            Recording in progress...
        </p>
      )}
    </div>
        );

      case "Edit":
        return (
          <div className="Enter">
            <h1>Edit</h1>
            <p>All Recorded Commands:</p>

             {recordings.length === 0 ? (
              <p>No recordings yet.</p>
             ) : (
                <ul style={{ listStyleType: "none", padding: 0 }}>
                  {recordings.map((rec, index) => (
                    <li key={index} style={{ marginBottom: "20px" }}>
                      <strong>{rec.name}</strong>
                      <br />
                       <audio controls src={rec.audioURL}></audio>
                    </li>
                  ))}
              </ul>
            )}
          </div>
    );

      default:
        return null;
    }
  };

  return (
    <div className={`page-container ${isRecording ? "recording-active" : ""}`}>
      <div className="recording-indicator">
        <div className="dot"></div>
        <span>Recording...</span>
      </div>

      <div className="top-rectangle"></div>
      <div className="left-rectangle">
        <div className="border-buttons">
          <button
            className={activePage === "Home" ? "active-button" : ""}
            onClick={() => setActivePage("Home")}
          >
            <FaHome size={24} />
          </button>

          <button
            className={activePage === "Add" ? "active-button" : ""}
            onClick={() => setActivePage("Add")}
          >
            <FaPlusCircle size={24} />
          </button>

          <button
            className={activePage === "Edit" ? "active-button" : ""}
            onClick={() => setActivePage("Edit")}
          >
            <FaEdit size={24} />
          </button>
        </div>
      </div>

      <div className="content">{renderContent()}</div>
    </div>
  );
}

export default App;
