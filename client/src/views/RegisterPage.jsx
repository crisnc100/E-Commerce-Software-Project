import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/apiService';

const RegisterPage = () => {
  const [step, setStep] = useState(1);
  const [systemName, setSystemName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleNextStep = async () => {
    setError('');

    if (step === 1) {
      if (!systemName.trim()) {
        setError('System name cannot be empty');
        return;
      }

      try {
        const response = await apiService.validateSystemName({ system_name: systemName });
        if (!response.data.available) {
          setError('System name already exists');
          return;
        }
        setStep(2);
      } catch (err) {
        setError('Failed to validate system name. Please try again.');
        console.error(err);
      }
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (passcode !== confirmPasscode) {
      setError('Passcodes do not match');
      return;
    }

    try {
      await apiService.registerAdmin({
        system_name: systemName,
        first_name: firstName,
        last_name: lastName,
        email,
        passcode,
      });
      navigate('/dashboard'); // Redirect to the dashboard upon successful registration
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to register admin user.');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-6">
      <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
          {step === 1 ? 'Name Your System' : 'Set Up Your Admin Account'}
        </h2>

        {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

        {step === 1 && (
          <div>
            <p className="text-gray-600 text-center mb-4">
              Enter a unique name for your system to get started.
            </p>
            <input
              type="text"
              placeholder="System Name"
              value={systemName}
              onChange={(e) => setSystemName(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              required
            />
            <div className="flex justify-between items-center gap-4">
              <button
                onClick={() => navigate('/login')} // Navigate to Login Page
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition"
              >
                Back to Login
              </button>
              <button
                onClick={handleNextStep}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <form onSubmit={handleRegister} className="space-y-4">
            <p className="text-gray-600 text-center mb-4">
              Set up your admin account for the system: <strong>{systemName}</strong>
            </p>
            <input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Passcode"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <input
              type="password"
              placeholder="Confirm Passcode"
              value={confirmPasscode}
              onChange={(e) => setConfirmPasscode(e.target.value)}
              className="w-full px-4 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <div className="flex justify-between items-center gap-4">
              <button
                onClick={() => setStep(1)} // Go back to Step 1
                className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition"
              >
                Back
              </button>
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded transition"
              >
                Register Admin
              </button>
            </div>
          </form>
        )}

        <footer className="mt-6 text-gray-500 text-sm text-center">
          &copy; {new Date().getFullYear()} Your Company. All rights reserved.
        </footer>
      </div>
    </div>
  );
};

export default RegisterPage;
