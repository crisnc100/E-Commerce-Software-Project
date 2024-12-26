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
        console.log('Authenticated Response:', response.data); // Debug log

        setAuthStatus({
          loading: false,
          user: response.data.user, // Example: { role, email, is_temp_password }
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
  }, [allowedRoles]);

  const { loading, user } = authStatus;

  // Show loading state while authentication is being checked
  if (loading) {
    return <div>Loading...</div>;
  }

  // Redirect to login if the user is not authenticated
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Check if the user has a temporary password and redirect to update-password
  if (user.is_temp_password) {
    return <Navigate to="/update-password-required" replace />;
  }

  // Restrict access if the user's role is not allowed
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  // Render the protected content
  return React.cloneElement(children, { user });
};

export default ProtectedRoute;
