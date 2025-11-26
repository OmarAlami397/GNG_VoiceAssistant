import React, { useState, useEffect } from "react";
import { deleteGroupFromPi } from "../backend/piApi.js";

export default function PlaylistTable({ newCommand, onCommandSelect }) {
  const [commands, setCommands] = useState([]);

  const load = async () => {
    // FIXED: Use Pi API instead of localhost:3001
    const res = await fetch("http://GNG2101-VoiceBridge.local:8080/list_labels?user=default_user");
    const data = await res.json();

    const commandList = data.labels.map(label => ({
      title: label,
      recordings: []
    }));
    setCommands(commandList);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (newCommand) {
      setCommands((prev) => [
        ...prev,
        { title: newCommand.title, recordings: newCommand.recordings },
      ]);
    }
  }, [newCommand]);

  const playAudio = async (title) => {
    try {
      // FIXED: Fetch recordings from Pi API
      const response = await fetch(`http://GNG2101-VoiceBridge.local:8080/get_group_recordings?user=default_user&group_name=${encodeURIComponent(title)}`);
      const data = await response.json();
      if (data.recordings && data.recordings.length > 0) {
        const recording = data.recordings[0];
        if (recording.file_base64) {
          const audio = new Audio(`data:audio/wav;base64,${recording.file_base64}`);
          audio.play();
        }
      }
    } catch (error) {
      console.error("Error playing audio:", error);
    }
  };

  // FIXED: Use Pi API delete function
  const deleteCommand = async (title) => {
    setCommands((prev) => prev.filter((cmd) => cmd.title !== title));
    await deleteGroupFromPi(title);
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Command</th>
            <th>Script ID</th>
            <th>Play</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {commands.map((cmd, index) => (
            <tr key={cmd.title + index}>
              <td>{index + 1}</td>
              <td>{cmd.title}</td>
              <td>{cmd.recordings[0]?.script_id || "N/A"}</td>
              <td>
                <button onClick={() => playAudio(cmd.title)}>▶️ Play</button>
              </td>
              <td>
                <button onClick={() => deleteCommand(cmd.title)}>🗑 Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}