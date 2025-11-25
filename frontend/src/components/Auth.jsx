import React, { useState } from 'react';

const Auth = ({ onAuthSuccess }) => {
  const [ip, setIp] = useState('');
  const [token, setToken] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (ip && token) {
      onAuthSuccess({ ip, token });
    }
  };

  return (
    <div className="page-container">
      <div className="Enter">
        <h1>Please provide your IP and Long Lived Access Token</h1>
        <p>instrucitons</p>

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
        </form>
      </div>
    </div>
  );
};

export default Auth;