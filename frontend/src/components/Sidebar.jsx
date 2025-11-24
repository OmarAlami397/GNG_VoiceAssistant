import React from "react";
import { FaHome, FaPlusCircle, FaEdit } from "react-icons/fa";

export default function Sidebar({ activePage, setActivePage }) {
  return (
    <>
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
    </>
  );
}
