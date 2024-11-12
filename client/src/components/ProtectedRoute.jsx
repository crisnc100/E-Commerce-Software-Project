// src/components/ProtectedRoute.js

import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import apiService from '../services/apiService';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const response = await apiService.isAuthenticated();
        setIsAuthenticated(response.data.authenticated);
      } catch (error) {
        console.error('Authentication check failed:', error);
        setIsAuthenticated(false);
      }
    };

    checkAuthentication();
  }, []);

  // Prevent accessing protected routes if not authenticated
  if (isAuthenticated === null) {
    return <div>Loading...</div>; // Loading state while authentication is being verified
  }

  return isAuthenticated ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
