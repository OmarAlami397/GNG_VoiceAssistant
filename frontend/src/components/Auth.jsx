import React, { useState, useEffect } from 'react';

const Auth = ({ onAuthSuccess }) => {
  const [ip, setIp] = useState('');
  const [token, setToken] = useState('');

  //load saved credentials
  useEffect(() => {
    const savedIp = localStorage.getItem('hass_ip');
    const savedToken = localStorage.getItem('hass_token');
    
    if (savedIp) setIp(savedIp);
    if (savedToken) setToken(savedToken);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ip && token) {
      //save to localStorage
      localStorage.setItem('hass_ip', ip);
      localStorage.setItem('hass_token', token);
      
      onAuthSuccess({ ip, token });
    }
  };

  const clearSaved = () => {
    localStorage.removeItem('hass_ip');
    localStorage.removeItem('hass_token');
    setIp('');
    setToken('');
  };

  return (
    <div className="page-container">
      <div className="Enter">
        <h1>Please provide your IP and Long Lived Access Token</h1>
        <p>instructions</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="IP Address"
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            className="input-box"
          />
          
          <input
            type="text"
            placeholder="Long Lived Access Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="input-box"
          />

          <button type="submit" className="enter-button">
            Connect
          </button>

          {(localStorage.getItem('hass_ip') || localStorage.getItem('hass_token')) && (
            <button 
              type="button" 
              onClick={clearSaved}
              className="clear-button"
              style={{ marginTop: '10px', background: '#ff4444' }}
            >
              Clear Saved Credentials
            </button>
          )}
        </form>
      </div>
    </div>
  );
};

export default Auth;