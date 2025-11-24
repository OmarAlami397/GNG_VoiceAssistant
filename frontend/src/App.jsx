import React, { useState } from "react";
import "./App.css";

import Sidebar from "./components/Sidebar.jsx";
import HomePage from "./components/HomePage.jsx";
import AddPage from "./components/AddPage.jsx";
import EditPage from "./components/EditPage.jsx";

export default function App() {
  const [activePage, setActivePage] = useState("Home");
  const [inputValue, setInputValue] = useState("");
  const [newCompletedCommand, setNewCompletedCommand] = useState(null);

  const renderPage = () => {
    switch (activePage) {
      case "Home":
        return (
          <HomePage
            inputValue={inputValue}
            setInputValue={setInputValue}
            setActivePage={setActivePage}
          />
        );

      case "Add":
        return (
          <AddPage
            inputValue={inputValue}
            setInputValue={setInputValue}
            onComplete={(command) => setNewCompletedCommand(command)}
          />
        );

      case "Edit":
      return <EditPage newCommand={newCompletedCommand} />;

      default:
        return null;
    }
  };

  return (
    <div className="page-container">
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="content">{renderPage()}</div>
    </div>
  );
}
