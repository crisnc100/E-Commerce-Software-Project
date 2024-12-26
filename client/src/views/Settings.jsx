import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';

const Settings = () => {
  const [userInfo, setUserInfo] = useState({
    first_name: '',
    last_name: '',
    email: '',
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await apiService.getUser();
        setUserInfo({
          first_name: response.data.first_name,
          last_name: response.data.last_name,
          email: response.data.email,
        });
      } catch (err) {
        setErrorMessage('Failed to load user information.');
        setTimeout(() => setErrorMessage(''), 3000);
      }
    };

    fetchUserInfo();
  }, []);

  const handleUserInfoChange = (e) => {
    const { name, value } = e.target;
    setUserInfo((prev) => ({ ...prev, [name]: value }));
  };

  const handleUpdateUserInfo = async () => {
    try {
      const response = await apiService.updateUserInfo(userInfo);
      setSuccessMessage(response.data.success);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to update user information.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      const response = await apiService.updateUserPassword(
        currentPassword,
        newPassword,
        confirmPassword
      );
      setSuccessMessage(response.data.success);
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to update password.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  const handleRequestTempPassword = async () => {
    try {
      const response = await apiService.forgotPasscode(userInfo.email);
      setSuccessMessage(response.data.success);
      setTimeout(() => setSuccessMessage(''), 3000);
      setIsModalOpen(false);
    } catch (err) {
      setErrorMessage(err.response?.data?.error || 'Failed to request temporary password.');
      setTimeout(() => setErrorMessage(''), 3000);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white shadow-md rounded-lg mt-8">
      <h2 className="text-2xl font-bold mb-6">Settings</h2>

      {/* Success and Error Messages */}
      {successMessage && (
        <div className="mb-4 rounded-md bg-green-50 p-4">
          <p className="text-green-600">{successMessage}</p>
        </div>
      )}
      {errorMessage && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <p className="text-red-600">{errorMessage}</p>
        </div>
      )}

      {/* Update User Info Section */}
      <section className="mb-8">
        <h3 className="text-xl font-semibold mb-4">Personal Information</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label
                htmlFor="first_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                First Name
              </label>
              <input
                type="text"
                name="first_name"
                id="first_name"
                value={userInfo.first_name}
                onChange={handleUserInfoChange}
                placeholder="Enter your first name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label
                htmlFor="last_name"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Last Name
              </label>
              <input
                type="text"
                name="last_name"
                id="last_name"
                value={userInfo.last_name}
                onChange={handleUserInfoChange}
                placeholder="Enter your last name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              id="email"
              value={userInfo.email}
              onChange={handleUserInfoChange}
              placeholder="Enter your email"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <button
          onClick={handleUpdateUserInfo}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-md mt-4"
        >
          Save Changes
        </button>
      </section>

      {/* Change Password Section */}
      <section>
        <h3 className="text-xl font-semibold mb-4">Password Management</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-md"
        >
          Update Password
        </button>
      </section>

      {/* Password Update Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">Update Password</h3>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="current_password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Current Password
                </label>
                <input
                  type="password"
                  id="current_password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="new_password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  New Password
                </label>
                <input
                  type="password"
                  id="new_password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label
                  htmlFor="confirm_password"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm New Password
                </label>
                <input
                  type="password"
                  id="confirm_password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                onClick={handleRequestTempPassword}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md font-medium"
              >
                Request Temp Password
              </button>
              <button
                onClick={handleUpdatePassword}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md font-medium"
              >
                Save
              </button>
              <button
                onClick={() => setIsModalOpen(false)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
