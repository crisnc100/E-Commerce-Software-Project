import React, { useEffect, useState } from 'react';
import { FaUserPlus, FaShoppingCart } from 'react-icons/fa';
import ReactTypingEffect from 'react-typing-effect';
import AddClientModal from './AddClientModal'; // Assuming this is for adding clients
import AddPurchaseModal from './AddPurchaseModal'; // New modal for creating purchases

const MainPage = () => {
  const [currentTime, setCurrentTime] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      setCurrentTime(timeString);
    };

    updateClock(); // Initialize clock immediately
    const interval = setInterval(updateClock, 1000); // Update clock every second

    return () => clearInterval(interval); // Cleanup interval on component unmount
  }, []);

  return (
    <div className="p-4 space-y-6">
      {/* Welcome Message */}
      <ReactTypingEffect
        text={['Welcome Back!']}
        className="text-2xl font-semibold text-center text-gray-800 mb-6"
        speed={100}
        eraseDelay={1000000} // Prevents erasing the text
        typingDelay={500}    // Delay before typing starts
      />

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 text-green-700 p-2 mb-4 rounded-md">
          {successMessage}
        </div>
      )}

      {/* Clock Section */}
      <div className="flex justify-end">
        <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold">Current Time</h2>
          <p id="clock" className="text-2xl mt-2">{currentTime}</p>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="flex justify-start space-x-4 mt-4">
        {/* Add New Customer Button */}
        <button
          onClick={() => setIsClientModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 flex items-center space-x-2 rounded-lg shadow"
        >
          <FaUserPlus />
          <span>Add New Customer</span>
        </button>

        {/* Create New Purchase Button */}
        <button
          onClick={() => setIsPurchaseModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 flex items-center space-x-2 rounded-lg shadow"
        >
          <FaShoppingCart />
          <span>Create New Purchase</span>
        </button>
      </div>

      {/* Main Content Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Search Feature */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Search Products</h2>
          <input
            type="text"
            placeholder="Search products..."
            className="w-full p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
            {/* Placeholder for product images */}
            <div className="bg-gray-100 p-4 rounded-lg shadow">
              <img
                src="https://via.placeholder.com/150"
                alt="Product Screenshot"
                className="w-full h-32 object-cover rounded-lg"
              />
              <p className="mt-2 text-sm text-center">Product Name</p>
            </div>
          </div>
        </div>

        {/* Monthly Purchases Overview */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Purchases This Month</h2>
          <ul className="space-y-2">
            <li className="flex justify-between">
              <span>Client A</span>
              <span>$200</span>
            </li>
            <li className="flex justify-between">
              <span>Client B</span>
              <span>$150</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Weekly Summary Section */}
      <div className="bg-white p-6 rounded-lg shadow-md mt-6">
        <h2 className="text-xl font-bold mb-4">Weekly Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col items-center bg-gray-100 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">New Clients</h3>
            <p className="text-2xl font-bold text-green-600">5</p>
          </div>
          <div className="flex flex-col items-center bg-gray-100 p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold">Total Sales</h3>
            <p className="text-2xl font-bold text-blue-600">$1,500</p>
          </div>
        </div>
      </div>

      {/* Modals */}
      {isClientModalOpen && (
        <AddClientModal
          onClose={() => setIsClientModalOpen(false)}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(''), 3000);
          }}
        />
      )}
      {isPurchaseModalOpen && (
        <AddPurchaseModal
          onClose={() => setIsPurchaseModalOpen(false)}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(''), 3000);
          }}
        />
      )}
    </div>
  );
};

export default MainPage;
