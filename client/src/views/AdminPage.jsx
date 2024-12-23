import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import { FiTrash2 } from 'react-icons/fi';

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
      // Fetch the updated user list after adding the user
      const updatedUsers = await apiService.getUsersBySystem();
      setUsers(updatedUsers.data); // Ensure the list is refreshed
      setNewUser({ first_name: '', last_name: '', email: '', role: 'user' }); // Reset form
      setSuccessMessage('User added successfully!');

      // Hide the success message after 3 seconds
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



  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await apiService.deleteUser(userId);
      setUsers(users.filter((user) => user.id !== userId));
    } catch (err) {
      setError('Failed to delete user');
    }
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
              <td className="border px-4 py-2">{user.last_login || 'N/A'}</td>
              <td className="border px-4 py-2">
                {user.role !== 'admin' && (
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <FiTrash2 className="inline-block" /> Delete
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminPage;
