// src/components/AutoLogout.jsx

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const AutoLogout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    let timer;

    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        apiService.logout().then(() => {
          navigate('/');
        });
      }, 60 * 60 * 1000); // Auto-lock after 10 minutes
    };

    // Reset the timer on user activity
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);

    // Start the timer
    resetTimer();

    // Cleanup on component unmount
    return () => {
      clearTimeout(timer);
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
    };
  }, [navigate]);

  return null;
};

export default AutoLogout;
