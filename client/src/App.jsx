import React, {useState, useEffect} from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Settings from './views/Settings';
import AdminPage from './views/AdminPage';
import AdminRoute from './components/AdminRoute';
import UpdatePasswordRequired from './views/UpdatePasswordRequired';
import HomePage from './views/HomePage';
import RegisterPage from './views/RegisterPage';
import LoginPage from './views/LoginPage';
import ForgotPassword from './views/ForgotPassword';
import Dashboard from './views/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AutoLogout from './components/AutoLogout'; // Auto-logout for inactivity
import MainPage from './views/MainPage';
import ProductsTab from './views/ProductsTab';
import ClientsTab from './views/ClientsTab';
import PaymentsTab from './views/PaymentsTab';
import ClientIDPage from './views/ClientIDPage';
import Analytics from './views/Analytics';
import apiService from './services/apiService';


function App() {
  const [userRole, setUserRole] = useState('')


  useEffect(() => {
    const fetchUserRole = async () => {
        try {
            const response = await apiService.getUser();
            setUserRole(response.data.role);
        } catch (err) {
            console.error('Error fetching user role:', err);
        }
    };

    fetchUserRole();
}, []);

  return (
    <>
      <BrowserRouter>
        <AutoLogout /> {/* This ensures the user is auto-logged out after inactivity */}

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/update-password-required" element={<UpdatePasswordRequired />} />


          {/* Protect the dashboard and nested routes */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute allowedRoles={['admin', 'user']}>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<MainPage />} /> {/* Default dashboard content */}
            <Route path="settings" element={<Settings />} />
            <Route
              path="admin"
              element={
                <AdminRoute>
                  <AdminPage />
                </AdminRoute>
              }
            />
            <Route path="products" element={<ProductsTab />} />
            <Route path="clients" element={<ClientsTab />} />
            <Route path="clients/:clientId/:clientName" element={<ClientIDPage />} />
            <Route path="payments" element={<PaymentsTab />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>

        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
