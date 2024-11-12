// src/components/Navbar.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUpload, FiLock, FiUser } from 'react-icons/fi';
import apiService from '../../services/apiService';
import UploadProductModal from '../UploadProductModal';

const Navbar = () => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await apiService.logout();
      sessionStorage.clear();  
      localStorage.clear();    
      navigate('/');          
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen(!isProfileMenuOpen);
  };

  const closeProfileMenu = (e) => {
    if (isProfileMenuOpen && !e.target.closest('.profile-menu')) {
      setIsProfileMenuOpen(false);
    }
  };

  useEffect(() => {
    document.addEventListener('click', closeProfileMenu);
    return () => {
      document.removeEventListener('click', closeProfileMenu);
    };
  }, [isProfileMenuOpen]);

  return (
    <nav className="bg-gray-800 p-4 flex justify-between items-center">
      <div className="flex-1 mx-4">
        <input
          type="text"
          placeholder="Search products..."
          className="w-full p-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
        >
          <FiUpload className="mr-2" /> Upload Product
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg"
        >
          <FiLock className="mr-2" /> Lock Software
        </button>

        <div className="relative profile-menu">
          <button
            onClick={toggleProfileMenu}
            className="flex items-center bg-gray-700 text-white py-2 px-4 rounded-lg focus:outline-none"
          >
            <FiUser className="mr-2" /> Profile
          </button>
          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg flex flex-col">
              <Link
                to="/change-passcode"
                className="block px-4 py-2 text-gray-800 hover:bg-gray-200"
              >
                Change Password
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-200"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Product Modal */}
      {isUploadModalOpen && <UploadProductModal onClose={() => setIsUploadModalOpen(false)} />}
    </nav>
  );
};

export default Navbar;
