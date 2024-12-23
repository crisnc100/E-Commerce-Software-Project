import React from 'react';
import { Navigate } from 'react-router-dom';

const AdminRoute = ({ children, role }) => {
  if (role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export default AdminRoute;
