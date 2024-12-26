import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import { FiTrash2, FiRefreshCw } from 'react-icons/fi';

const AdminPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newUser, setNewUser] = useState({
    first_name: '',
    last_name: '',
    email: '',
    role: 'user',
  });
  const [addingUser, setAddingUser] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // For resend password
  const [isResendConfirmModalOpen, setIsResendConfirmModalOpen] = useState(false);
  const [resendUserId, setResendUserId] = useState(null);
  const [isResendingPassword, setIsResendingPassword] = useState(false);

  // For deleting user
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await apiService.getUsersBySystem();
        setUsers(response.data);
      } catch (err) {
        setError('Failed to fetch users');
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleAddUser = async () => {
    setAddingUser(true);
    setError('');
    setSuccessMessage('');
    try {
      await apiService.addUserWithTempPass(
        newUser.first_name,
        newUser.last_name,
        newUser.email,
        newUser.role
      );
      // Fetch the updated user list
      const updatedUsers = await apiService.getUsersBySystem();
      setUsers(updatedUsers.data);
      setNewUser({ first_name: '', last_name: '', email: '', role: 'user' });
      setSuccessMessage('User added successfully!');
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      if (err.response?.data?.error === 'Email already exists in the system') {
        setError('This email is already in use.');
      } else {
        setError('Failed to add user.');
      }
    } finally {
      setAddingUser(false);
    }
  };

  // === Resend Password Flow ===
  const confirmResendTempPassword = (userId) => {
    setResendUserId(userId);
    setIsResendConfirmModalOpen(true);
  };

  const handleResendTempPassword = async () => {
    setError('');
    setSuccessMessage('');
    setIsResendingPassword(true); // show "Sending..."

    try {
      const response = await apiService.resendTempPassword(resendUserId);
      setSuccessMessage(response.data.message);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to resend temporary password.');
    } finally {
      setIsResendConfirmModalOpen(false);
      setResendUserId(null);
      setIsResendingPassword(false); // hide "Sending..."
    }
  };

  // === Delete User Flow ===
  const confirmDelete = (userId) => {
    setDeleteUserId(userId);
    setIsConfirmModalOpen(true);
  };

  const handleDeleteUser = async () => {
    setError('');
    setSuccessMessage('');
    setIsDeletingUser(true); // show "Deleting..."

    try {
      await apiService.deleteUser(deleteUserId);
      setUsers((prev) => prev.filter((user) => user.id !== deleteUserId));
      setSuccessMessage('User deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      setError('Failed to delete user');
    } finally {
      setIsConfirmModalOpen(false);
      setDeleteUserId(null);
      setIsDeletingUser(false); // hide "Deleting..."
    }
  };

  const formatDateSafely = (dateString) => {
    if (!dateString) return 'Unknown Date';
  
    const date = new Date(dateString);
    const correctedDate = new Date(
      date.getTime() + date.getTimezoneOffset() * 60000
    );
  
    return isNaN(correctedDate)
      ? 'Unknown Date'
      : correctedDate.toLocaleString(); // This includes both date and time
  };
  

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Admin Dashboard</h2>

      {/* Add User Form */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2">Add New User</h3>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        {successMessage && <p className="text-green-500 mb-2">{successMessage}</p>}
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="First Name"
            value={newUser.first_name}
            onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
            className="border p-2 rounded"
          />
          <input
            type="text"
            placeholder="Last Name"
            value={newUser.last_name}
            onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
            className="border p-2 rounded"
          />
          <input
            type="email"
            placeholder="Email"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
            className="border p-2 rounded"
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            className="border p-2 rounded"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
          <button
            onClick={handleAddUser}
            className="bg-blue-500 hover:bg-blue-700 text-white px-4 py-2 rounded"
            disabled={addingUser}
          >
            {addingUser ? 'Adding...' : 'Add User'}
          </button>
        </div>
      </div>

      {/* User Table */}
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-200">
            <th className="border px-4 py-2">Name</th>
            <th className="border px-4 py-2">Email</th>
            <th className="border px-4 py-2">Role</th>
            <th className="border px-4 py-2">Last Login</th>
            <th className="border px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-100">
              <td className="border px-4 py-2">{`${user.first_name} ${user.last_name}`}</td>
              <td className="border px-4 py-2">{user.email}</td>
              <td className="border px-4 py-2 capitalize">{user.role}</td>
              <td className="border px-4 py-2">
                {user.last_login ? formatDateSafely(user.last_login) : 'N/A'}
              </td>
              <td className="border px-4 py-2">
                {user.role !== 'admin' && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => confirmDelete(user.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <FiTrash2 className="inline-block" /> Delete
                    </button>
                    {user.is_temp_password === 1 && (
                      <button
                        onClick={() => confirmResendTempPassword(user.id)}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <FiRefreshCw className="inline-block" /> Resend Password
                      </button>
                    )}
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Delete Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold mb-4">Confirm Deletion</h2>
            <p>Are you sure you want to delete this user?</p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setDeleteUserId(null);
                }}
                className="mr-4 bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg"
                disabled={isDeletingUser}
              >
                {isDeletingUser ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resend Password Confirmation Modal */}
      {isResendConfirmModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold mb-4">Resend Password</h2>
            <p>Are you sure you want to resend a temporary password to this user?</p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setIsResendConfirmModalOpen(false);
                  setResendUserId(null);
                }}
                className="mr-4 bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleResendTempPassword}
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
                disabled={isResendingPassword}
              >
                {isResendingPassword ? 'Sending...' : 'Resend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
