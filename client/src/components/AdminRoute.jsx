import React from 'react';
import { Navigate, useOutletContext } from 'react-router-dom';

const AdminRoute = ({ children }) => {
  const { user } = useOutletContext();  // This will NOT be undefined now

  if (!user) {
    return <div>Loading...</div>;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

export default AdminRoute;
