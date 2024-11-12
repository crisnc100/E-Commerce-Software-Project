// src/views/ForgotPasscode.js

import React, { useState } from 'react';
import apiService from '../services/apiService';
import { useNavigate } from 'react-router-dom';

const ForgotPasscode = () => {
  const [email, setEmail] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPasscode !== confirmPasscode) {
      setError('Passcodes do not match');
      return;
    }

    try {
      await apiService.resetPasscode(email, newPasscode);
      setSuccess('Passcode reset successfully. You can now log in.');
      setTimeout(() => {
        navigate('/');
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset passcode');
    }
  };

  return (
    <div className="forgot-passcode">
      <h2>Reset Your Passcode</h2>
      <form onSubmit={handleReset}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="New Passcode"
          value={newPasscode}
          onChange={(e) => setNewPasscode(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Confirm New Passcode"
          value={confirmPasscode}
          onChange={(e) => setConfirmPasscode(e.target.value)}
          required
        />
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
        <button type="submit">Reset Passcode</button>
      </form>
    </div>
  );
};

export default ForgotPasscode;
