// src/views/AuthPage.jsx

import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiService from '../services/apiService';
import ReactTypingEffect from 'react-typing-effect';  // Import the typing effect component


const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [error, setError] = useState('');
  const [isNewPasscode, setIsNewPasscode] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if a passcode already exists
    apiService
      .checkPasscodeExists()
      .then((response) => {
        setIsNewPasscode(!response.data.exists);
      })
      .catch((error) => {
        console.error('Error checking passcode existence:', error);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isNewPasscode) {
      // Initial passcode setup
      if (passcode !== confirmPasscode) {
        setError('Passcodes do not match');
        return;
      }

      try {
        await apiService.setPasscode(email, passcode);
        navigate('/dashboard');
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to set passcode');
      }
    } else {
      // Passcode verification
      try {
        await apiService.verifyPasscode(passcode);
        navigate('/dashboard');
      } catch (err) {
        setError('Incorrect passcode');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-purple-200">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
        <ReactTypingEffect
          text={['Welcome, Maria Ortega!']}
          className="text-2xl font-semibold text-center text-gray-800 mb-6"
          speed={100}
          eraseDelay={1000000} // Prevents erasing the text
          typingDelay={500}    // Delay before typing starts
        />
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isNewPasscode ? (
            <>
              <p className="text-center text-gray-600">
                Please set your passcode to unlock the project
              </p>
              <input
                type="email"
                placeholder="Email"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Passcode"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Confirm Passcode"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value)}
                required
              />
            </>
          ) : (
            <>
              <p className="text-center text-gray-600">
                Please enter your passcode to unlock the project
              </p>
              <input
                type="password"
                placeholder="Passcode"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
              />
              <div className="text-right">
                <Link
                  to="/forgot-passcode"
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  Forgot Passcode?
                </Link>
              </div>
            </>
          )}
          {error && (
            <p className="text-red-500 text-center text-sm">{error}</p>
          )}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-200"
          >
            {isNewPasscode ? 'Set Passcode' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
