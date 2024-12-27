import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactTypingEffect from 'react-typing-effect';
import { FiEye, FiEyeOff } from 'react-icons/fi'; // Icons for show/hide passcode
import apiService from '../services/apiService';

const LoginPage = () => {
  const [isQuickLogin, setIsQuickLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [userName, setUserName] = useState('');
  const [showPasscode, setShowPasscode] = useState(false); // Toggles passcode visibility
  const [isLoading, setIsLoading] = useState(false); // Manage login state


  const navigate = useNavigate();

  useEffect(() => {
    const checkSystemStatus = async () => {
      try {
        const response = await apiService.systemExists();
        console.log('System Exists Response:', response.data);

        const sessionActive = response.data.session_active;
        if (sessionActive) {
          const user = await fetchUserName();
          // Disable Quick Login for users with temp passwords
          if (user && user.is_temp_password) {
            setIsQuickLogin(false);
          } else {
            setIsQuickLogin(response.data.quick_login_available);
          }
        } else {
          setIsQuickLogin(response.data.quick_login_available);
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
      return response.data; // Return the user data to check is_temp_password
    } catch (err) {
      console.error('Error fetching user name:', err);
      return null;
    }
  };

  const handleLogin = async () => {
    setIsLoading(true); // Start loading
    setError('');
    try {
      let response;
      if (isQuickLogin) {
        response = await apiService.quickLogin({ passcode });
      } else {
        response = await apiService.login({ email, passcode });
      }
      // Redirect to dashboard if login is successful
      navigate('/dashboard');
    } catch (err) {
      // Handle 403 error specifically for temporary password
      if (err.response?.status === 403 && err.response?.data?.force_password_change) {
        navigate('/update-password-required');
      } else if (err.response?.status === 403) {
        setError('Temporary password has expired. Contact the admin for a new password.');
      } else {
        setError(err.response?.data?.error || 'Login failed');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleLogin();
  };

  const togglePasscodeVisibility = () => {
    setShowPasscode((prev) => !prev);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          {isQuickLogin ? (
            <ReactTypingEffect
              text={`Welcome back, ${userName || 'User'}!`}
              className="text-3xl font-semibold text-gray-800"
              speed={100}
              eraseDelay={1000000}
              typingDelay={500}
            />
          ) : (
            'Login'
          )}
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

          {/* Passcode input with show/hide icon */}
          <div className="relative">
            <input
              type={showPasscode ? 'text' : 'password'}
              placeholder="Passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={togglePasscodeVisibility}
              className="absolute right-3 top-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              {showPasscode ? <FiEyeOff /> : <FiEye />}
            </button>
          </div>

          {/* Forgot Password link (subtle) */}
          {!isQuickLogin && (
            <div className="mt-1 text-right">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-sm text-blue-600 hover:underline"
              >
                Forgot your password?
              </button>
            </div>
          )}

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
            disabled={isLoading} // Disable button during loading
          >
            {isLoading
              ? isQuickLogin
                ? 'Unlocking...'
                : 'Logging in...'
              : isQuickLogin
                ? 'Unlock'
                : 'Login'}
          </button>

        </form>

        <div className="mt-6 flex flex-col gap-4">
          {isQuickLogin && (
            <button
              onClick={() => setIsQuickLogin(false)}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition"
            >
              Switch to Normal Login
            </button>
          )}
          <button
            onClick={() => navigate('/register')}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition"
          >
            Register a New System
          </button>
        </div>

        <footer className="mt-6 text-gray-500 text-sm text-center">
          &copy; {new Date().getFullYear()} Your Company. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default LoginPage;
