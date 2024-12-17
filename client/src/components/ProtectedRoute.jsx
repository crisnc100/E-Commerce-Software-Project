import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import apiService from '../services/apiService';

const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const [authStatus, setAuthStatus] = useState({
    loading: true,
    user: null,
    error: null,
  });

  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        const response = await apiService.isAuthenticated();
        setAuthStatus({
          loading: false,
          user: response.data.user, // Example: { role, email }
          error: null,
        });
      } catch (error) {
        console.error('Authentication check failed:', error);
        setAuthStatus({
          loading: false,
          user: null,
          error: error.message || 'Failed to authenticate',
        });
      }
    };

    checkAuthentication();
  }, []);

  const { loading, user } = authStatus;

  // Show loading state while authentication is being checked
  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect if user is not authenticated or role is not allowed
  if (!user || (allowedRoles.length > 0 && !allowedRoles.includes(user.role))) {
    return <Navigate to="/" replace />;
  }

  // Render the protected content
  return children;
};

export default ProtectedRoute;
