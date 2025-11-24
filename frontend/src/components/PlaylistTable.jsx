import React, { useState, useEffect } from "react";
import { deleteGroupFromPi } from "srs/backend/piApi";

export default function PlaylistTable({ newCommand }) {
  const [commands, setCommands] = useState([]);

  const load = async () => {
    const res = await fetch("http://localhost:3001/recordings");
    const data = await res.json();

    const groups = {};
    data.forEach((rec) => {
      if (!groups[rec.title]) groups[rec.title] = [];
      groups[rec.title][rec.version - 1] = rec;
    });

    setCommands(
      Object.keys(groups).map((title) => ({
        title,
        recordings: groups[title],
      }))
    );
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

  const playAudio = (rec) => {
    if (!rec) return;
    const array = new Uint8Array(rec.file_base64
      ? atob(rec.file_base64).split("").map((c) => c.charCodeAt(0))
      : rec.file_data.data
    );
    const blob = new Blob([array], { type: "audio/webm" });
    const url = URL.createObjectURL(blob);
    new Audio(url).play();
  };

  const deleteCommand = async (title) => {
    setCommands((prev) => prev.filter((cmd) => cmd.title !== title));
    await fetch(`http://localhost:3001/recordings/title/${title}`, {
      method: "DELETE",
    });

    //delete from raspberry pi
    await deleteGroupFromPi(title);
  };

  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Command</th>
            <th>Play</th>
            <th>Delete</th>
          </tr>
        </thead>
        <tbody>
          {commands.map((cmd, index) => (
            <tr key={cmd.title + index}>
              <td>{index + 1}</td>
              <td>{cmd.title}</td>
              <td>
                <button onClick={() => playAudio(cmd.recordings[0])}>▶️ Play</button>
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

