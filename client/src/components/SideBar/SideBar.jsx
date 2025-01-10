import React from 'react';
import { Link } from 'react-router-dom';

const SideBar = ({ sidebarToggle }) => {
  return (
    <div
      className={`
        ${sidebarToggle ? 'hidden' : 'block'}
        w-64 md:w-72
        bg-gray-800 text-white flex flex-col
      `}
    >
      {/* Logo or Brand */}
      <div className="p-4 text-2xl font-bold border-b border-gray-700">
        Dashboard
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-4">
        <Link to="/dashboard" className="block py-2 px-4 rounded hover:bg-gray-700 text-lg">
          Home
        </Link>
        <Link to="products" className="block py-2 px-4 rounded hover:bg-gray-700 text-lg">
          Products
        </Link>
        <Link to="clients" className="block py-2 px-4 rounded hover:bg-gray-700 text-lg">
          Clients
        </Link>
        <Link to="payments" className="block py-2 px-4 rounded hover:bg-gray-700 text-lg">
          Payments
        </Link>
        <Link to="analytics" className="block py-2 px-4 rounded hover:bg-gray-700 text-lg">
          Analytics
        </Link>
      </nav>
    </div>
  );
};

export default SideBar;
