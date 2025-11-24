import React from "react";
export default function HomePage({ inputValue, setInputValue, setActivePage }) {
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

      <button className="enter-button" onClick={() => setActivePage("Add")}>
        Enter
      </button>
    </div>
  );
}