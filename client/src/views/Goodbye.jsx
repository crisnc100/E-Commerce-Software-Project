import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Goodbye = () => {
  const navigate = useNavigate();
  const { state } = useLocation();

  // Determine message based on 'state.type'
  let message;
  if (state?.type === 'system') {
    message = 'Your system has been deactivated successfully.';
  } else if (state?.type === 'account') {
    message = 'Your account has been deactivated successfully.';
  } else {
    // Fallback (if no state or unknown type)
    message = 'Your account or system has been deactivated successfully.';
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/');
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md text-center">
        <h1 className="text-3xl font-bold mb-4">Goodbye!</h1>
        <p className="text-gray-700">
          {message}
        </p>
        <p className="text-gray-500 mt-2">
          You will be redirected to the home page shortly...
        </p>
      </div>
    </div>
  );
};

export default Goodbye;
