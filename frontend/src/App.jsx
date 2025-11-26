import React, { useState, useEffect } from "react";
import "./App.css";

import Sidebar from "./components/Sidebar.jsx";
import HomePage from "./components/HomePage.jsx";
import AddPage from "./components/AddPage.jsx";
import EditPage from "./components/EditPage.jsx";
import Auth from "./components/Auth.jsx";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState(null);
  const [activePage, setActivePage] = useState("Home");
  const [inputValue, setInputValue] = useState("");
  const [newCompletedCommand, setNewCompletedCommand] = useState(null);

  useEffect(() => {
    const savedIp = localStorage.getItem('hass_ip');
    const savedToken = localStorage.getItem('hass_token');
    
    if (savedIp && savedToken) {
      setIsAuthenticated(true);
      setCredentials({ ip: savedIp, token: savedToken });
    }
  }, []);

  const handleAuthSuccess = (authCredentials) => {
    setIsAuthenticated(true);
    setCredentials(authCredentials);
    console.log('Authentication successful:', authCredentials);
  };

  const handleResetIP = () => {
    localStorage.removeItem('hass_ip');
    localStorage.removeItem('hass_token');
    setIsAuthenticated(false);
    setCredentials(null);
    setActivePage("Home");
  };

  const renderPage = () => {
    switch (activePage) {
      case "Home":
        return (
          <HomePage
            inputValue={inputValue}
            setInputValue={setInputValue}
            setActivePage={setActivePage}
            credentials={credentials}
          />
        );

      case "Add":
        return (
          <AddPage
            inputValue={inputValue}
            setInputValue={setInputValue}
            onComplete={(command) => setNewCompletedCommand(command)}
            credentials={credentials}
          />
        );

      case "Edit":
        return <EditPage newCommand={newCompletedCommand} credentials={credentials} />;

      default:
        return null;
    }
  };

  if (!isAuthenticated) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="page-container">
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        onResetIP={handleResetIP}
      />
      <div className="content">{renderPage()}</div>
    </div>
  );
}