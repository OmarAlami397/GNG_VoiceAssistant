import React, { useState, useEffect } from "react";

export default function PlaylistTable({ newCommand }) {
  const [commands, setCommands] = useState([]);

  const load = async () => {
    const res = await fetch("http://localhost:3001/recordings");
    const data = await res.json();

    const groups = {};
    data.forEach((rec) => {
      if (!groups[rec.title]) {
        groups[rec.title] = {
          recordings: [],
          script_id: rec.script_id
        };
      }
      groups[rec.title].recordings[rec.version - 1] = rec;
    });

    const commandList = Object.keys(groups).map((title) => ({
      title,
      recordings: groups[title].recordings,
      script_id: groups[title].script_id
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
        { 
          title: newCommand.title, 
          recordings: newCommand.recordings,
          script_id: newCommand.scriptId || "N/A" 
        },
      ]);
    }
  }, [newCommand]);

  const playAudio = (rec) => {
    if (!rec) return;

    let audioBlob;

    if (rec.file_base64) {
      if (rec.file_base64.startsWith('data:')) {
        const audio = new Audio(rec.file_base64);
        audio.play();
        return;
      } else {
        const binaryString = atob(rec.file_base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        audioBlob = new Blob([bytes], { type: "audio/webm" });
      }
    } else if (rec.file_data && rec.file_data.data) {
      const buffer = new Uint8Array(rec.file_data.data);
      audioBlob = new Blob([buffer], { type: "audio/webm" });
    } else {
      return;
    }

    if (audioBlob && audioBlob.size > 0) {
      const url = URL.createObjectURL(audioBlob);
      const audio = new Audio(url);
      
      audio.onload = () => {
        URL.revokeObjectURL(url);
      };
      
      audio.play();
    }
  };

  const deleteCommand = async (title) => {
    setCommands((prev) => prev.filter((cmd) => cmd.title !== title));
    await fetch(`http://localhost:3001/recordings/title/${title}`, {
      method: "DELETE",
    });
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
              <td className="title-cell">{cmd.title}</td>
              <td className="title-cell">{cmd.script_id || "N/A"}</td>
              <td>
                <button onClick={() => {
                  if (cmd.recordings && cmd.recordings[0]) {
                    playAudio(cmd.recordings[0]);
                  }
                }}>
                  ▶️ Play
                </button>
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