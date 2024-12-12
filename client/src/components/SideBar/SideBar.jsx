import React from 'react';
import { Link } from 'react-router-dom';

const SideBar = () => {
  return (
    <div className="w-72 bg-gray-800 text-white h-screen fixed flex flex-col">
      {/* Logo or Brand */}
      <div className="p-4 text-2xl font-bold border-b border-gray-700">
        Maria's Dashboard
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
          Customers
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
