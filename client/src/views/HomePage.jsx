import React from 'react';
import { useNavigate } from 'react-router-dom';

const Homepage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">Welcome to the Ecommerce System</h1>
        <p className="text-gray-600 mb-6 text-center">Select an option to proceed:</p>
        <button
          onClick={() => navigate('/login')}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition mb-4"
        >
          Login into the System
        </button>
        <button
          onClick={() => navigate('/register')}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition"
        >
          Register a New System
        </button>
      </div>
    </div>
  );
};

export default Homepage;
