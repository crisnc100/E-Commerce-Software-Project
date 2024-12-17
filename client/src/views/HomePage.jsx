import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const HomePage = () => {
  const [systemExists, setSystemExists] = useState(false);
  const [sessionActive, setSessionActive] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check system status
    apiService.systemExists()
      .then((response) => {
        setSystemExists(response.data.exists);
        setSessionActive(response.data.session_active);

        if (response.data.session_active) {
          // Redirect to Quick Login if session exists
          navigate('/login');
        }
      })
      .catch((err) => console.error('Error checking system status:', err));
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to Your System</h1>
        {!systemExists ? (
          <>
            <p>No system exists. Set up your admin account.</p>
            <button
              onClick={() => navigate('/register')}
              className="bg-blue-500 text-white px-4 py-2 rounded"
            >
              Register Admin
            </button>
          </>
        ) : (
          <>
            <p>System is ready. Please log in.</p>
            <button
              onClick={() => navigate('/login')}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Go to Login
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default HomePage;
