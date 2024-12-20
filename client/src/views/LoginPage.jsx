import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const LoginPage = () => {
  const [isQuickLogin, setIsQuickLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const response = await apiService.systemExists();
        console.log('System Exists Response:', response.data); // Debug print
        setIsQuickLogin(response.data.quick_login_available);
        if (response.data.session_active) {
          fetchUserName(); // Fetch user's name only if session is active
        }
      } catch (err) {
        console.error('Error checking system status:', err);
      }
    };
  
    checkSystemStatus();
  }, []);
  
  

  const fetchUserName = async () => {
    try {
      const response = await apiService.getUser();
      setUserName(`${response.data.first_name} ${response.data.last_name}`);
    } catch (err) {
      console.error('Error fetching user name:', err);
    }
  };

  const handleLogin = async () => {
    try {
      let response;
      if (isQuickLogin) {
        response = await apiService.quickLogin({ passcode });
        console.log('Quick Login Response:', response.data); // Debug log
      } else {
        response = await apiService.login({ email, passcode });
        console.log('Normal Login Response:', response.data); // Debug log
      }
  
      console.log('Navigating to /dashboard'); // Debug print
      navigate('/dashboard');
    } catch (err) {
      console.error('Login Error:', err); // Debug log for errors
      setError(err.response?.data?.error || 'Login failed');
    }
  };
  
  

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          {isQuickLogin ? `Welcome back, ${userName || 'User'}!` : 'Login'}
        </h2>
        <p className="text-gray-600 text-center mb-6">
          {isQuickLogin
            ? 'Enter your passcode to unlock.'
            : 'Please enter your email and passcode to log in.'}
        </p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {!isQuickLogin && (
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          )}
          <input
            type="password"
            placeholder="Passcode"
            value={passcode}
            onChange={(e) => setPasscode(e.target.value)}
            className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
          >
            {isQuickLogin ? 'Unlock' : 'Login'}
          </button>
        </form>
        <footer className="mt-6 text-gray-500 text-sm text-center">
          &copy; {new Date().getFullYear()} Your Company. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;
