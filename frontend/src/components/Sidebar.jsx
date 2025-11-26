import React from "react";
import { FaHome, FaPlusCircle, FaEdit, FaSync } from "react-icons/fa";

export default function Sidebar({ activePage, setActivePage, onResetIP }) {
  return (
    <>
      <div className="top-rectangle">
        <button 
          className="reset-ip-button"
          onClick={onResetIP}
          title="Reset IP & Token"
        >
          <FaSync size={20} />
        </button>
      </div>

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
    </>
  );
}