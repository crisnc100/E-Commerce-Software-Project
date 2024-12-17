import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiService from '../services/apiService';
import ReactTypingEffect from 'react-typing-effect';

const AuthPage = () => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [error, setError] = useState('');
  const [isNewSystem, setIsNewSystem] = useState(true); // Detect new system setup
  const navigate = useNavigate();

  useEffect(() => {
    // Check if system is already initialized
    apiService
      .checkSystemExists()
      .then((response) => {
        setIsNewSystem(!response.data.exists); // If passcode exists, it's NOT a new system
      })
      .catch((error) => {
        console.error('Error checking system setup:', error);
      });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isNewSystem) {
      // Admin registration logic
      if (passcode !== confirmPasscode) {
        setError('Passcodes do not match');
        return;
      }

      try {
        await apiService.setPasscode(email, passcode, firstName, lastName);
        navigate('/system-homepage'); // Redirect to system homepage
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to set up system');
      }
    } else {
      // Passcode login logic
      try {
        await apiService.verifyPasscode(passcode);
        navigate('/dashboard'); // Unlock data and navigate
      } catch (err) {
        setError('Incorrect passcode');
      }
    }
  };

  const handleForgotPasscode = async () => {
    navigate('/forgot-passcode'); // Navigate to forgot passcode page
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-100 to-purple-200">
      <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full">
        <h2 className="text-2xl font-semibold text-center text-gray-800 mb-6">
          <ReactTypingEffect
            text={isNewSystem ? ['Welcome to Your System Setup!'] : ['Welcome Back!']}
            speed={100}
            eraseDelay={1000000}
            typingDelay={500}
          />
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isNewSystem ? (
            <>
              <p className="text-center text-gray-600">Set up your admin account to start using the system.</p>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="password"
                placeholder="Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-400"
              />
              <input
                type="password"
                placeholder="Confirm Passcode"
                value={confirmPasscode}
                onChange={(e) => setConfirmPasscode(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-400"
              />
            </>
          ) : (
            <>
              <p className="text-center text-gray-600">Enter your passcode to unlock the system.</p>
              <input
                type="password"
                placeholder="Passcode"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                required
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-blue-400"
              />
              <div className="flex justify-between items-center">
                <button
                  type="button"
                  className="text-blue-500 hover:text-blue-700 text-sm"
                  onClick={handleForgotPasscode}
                >
                  Forgot Passcode?
                </button>
                <Link
                  to="/login"
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  Login Instead
                </Link>
              </div>
            </>
          )}
          {error && <p className="text-red-500 text-center text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 rounded-md hover:bg-blue-600 transition duration-200"
          >
            {isNewSystem ? 'Register Admin' : 'Unlock'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
