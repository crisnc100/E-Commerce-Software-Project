import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const HomePage = () => {
  const [systemExists, setSystemExists] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    apiService
      .systemExists()
      .then((response) => {
        setSystemExists(response.data.exists);
        setSessionActive(response.data.session_active);

        if (response.data.session_active) {
          navigate('/login');
        }
      })
      .catch((err) => console.error('Error checking system status:', err));
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-6 text-center">
          Welcome to Your Ecommerce System
        </h1>
        <p className="text-gray-600 text-center mb-6">
          {systemExists
            ? 'Your system is ready. Please log in.'
            : 'No system exists. Please set up your admin account.'}
        </p>
        <div className="flex flex-col gap-4">
          {systemExists ? (
            <button
              onClick={() => navigate('/login')}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition"
            >
              Go to Login
            </button>
          ) : (
            <button
              onClick={() => navigate('/register')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
            >
              Register Admin
            </button>
          )}
        </div>
        <div className="mt-4 flex justify-center text-sm text-gray-500">
          {systemExists ? (
            <button
              onClick={() => navigate('/register')}
              className="hover:underline text-blue-600"
            >
              Don't have an account? Register
            </button>
          ) : (
            <button
              onClick={() => navigate('/login')}
              className="hover:underline text-blue-600"
            >
              Already have an account? Login
            </button>
          )}
        </div>
      </div>
      <footer className="mt-6 text-gray-500 text-sm text-center">
        &copy; {new Date().getFullYear()} Your Company. All rights reserved.
      </footer>
    </div>
  );
};

export default HomePage;
