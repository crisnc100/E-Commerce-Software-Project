import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './views/AuthPage';
import ForgotPasscode from './views/ForgotPasscode';
import Dashboard from './views/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import AutoLogout from './components/AutoLogout'; // Auto-logout for inactivity
import MainPage from './views/MainPage';
import ProductsTab from './views/ProductsTab';
import ClientsTab from './views/ClientsTab';
import PaymentsTab from './views/PaymentsTab';

function App() {
  return (
    <>
      <BrowserRouter>
        <AutoLogout /> {/* This ensures the user is auto-logged out after inactivity */}

        <Routes>
          <Route path="/" element={<AuthPage />} />
          <Route path="/forgot-passcode" element={<ForgotPasscode />} />
          
          {/* Protect the dashboard and nested routes */}
          <Route
            path="/dashboard/*"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          >
            <Route index element={<MainPage />} /> {/* Default dashboard content */}
            <Route path="products" element={<ProductsTab />} />
            <Route path="clients" element={<ClientsTab />} />
            <Route path="payments" element={<PaymentsTab />} />
          </Route>
          
        </Routes>
      </BrowserRouter>
    </>
  );
}

export default App;
