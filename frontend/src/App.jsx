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
    const savedAuth = sessionStorage.getItem('isAuthenticated');
    const savedCredentials = sessionStorage.getItem('credentials');
    
    if (savedAuth === 'true' && savedCredentials) {
      setIsAuthenticated(true);
      setCredentials(JSON.parse(savedCredentials));
    }
  }, []);

  const handleAuthSuccess = (authCredentials) => {
    setIsAuthenticated(true);
    setCredentials(authCredentials);
    

    sessionStorage.setItem('isAuthenticated', 'true');
    sessionStorage.setItem('credentials', JSON.stringify(authCredentials));
    
    console.log('Authentication successful:', authCredentials);
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
      <Sidebar activePage={activePage} setActivePage={setActivePage} />
      <div className="content">{renderPage()}</div>
    </div>
  );
}