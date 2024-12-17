import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const LoginPage = () => {
  const [isQuickLogin, setIsQuickLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    apiService.systemExists().then((response) => {
      if (response.data.session_active) {
        setIsQuickLogin(true);
      }
    });
  }, []);

  const handleLogin = async () => {
    try {
      if (isQuickLogin) {
        await apiService.quickLogin({ passcode });
      } else {
        await apiService.login({ email, passcode });
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  };

  return (
    <div>
      <h2>{isQuickLogin ? 'Quick Login' : 'Login'}</h2>
      {!isQuickLogin && (
        <input type="email" placeholder="Email" onChange={(e) => setEmail(e.target.value)} required />
      )}
      <input type="password" placeholder="Passcode" onChange={(e) => setPasscode(e.target.value)} required />
      {error && <p>{error}</p>}
      <button onClick={handleLogin}>{isQuickLogin ? 'Unlock' : 'Login'}</button>
    </div>
  );
};

export default LoginPage;
