import React, { useEffect, useState } from 'react';
import {
  FaUserPlus,
  FaShoppingCart,
  FaBell,
  FaExclamationCircle,
  FaImage,
} from 'react-icons/fa';
import ReactTypingEffect from 'react-typing-effect';
import AddClientModal from './AddClientModal';
import AddPurchaseModal from './AddPurchaseModal';
import apiService from '../services/apiService';
import { formatDistanceToNow } from 'date-fns';
import AddPaymentModal from './AddPaymentModal';

const MainPage = () => {
  const [currentTime, setCurrentTime] = useState('');
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedProductImage, setSelectedProductImage] = useState('');
  const [totalAmountDue, setTotalAmountDue] = useState(null);

  // Pagination states
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [purchasesPage, setPurchasesPage] = useState(1);

  const itemsPerPage = 5;

  // Clock Update
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString();
      setCurrentTime(timeString);
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);

    return () => clearInterval(interval);
  }, []);
  

  // Fetch Overdue Purchases and set as Notifications
  const fetchNotifications = async () => {
    try {
      const response = await apiService.getOverduePurchases();
      const overduePurchases = response.data;
      
      const notificationsData = overduePurchases.map((purchase) => {
        const purchaseDate = purchase.purchase_date
          ? new Date(purchase.purchase_date)
          : null;

        return {
          id: purchase.id,
          clientName: `${purchase.client_first_name} ${purchase.client_last_name}`,
          amount: purchase.amount,
          productName: purchase.product_name,
          dueDate: purchase.due_date,
          productImage: purchase.product_screenshot_photo,
          timeAgo: purchaseDate
            ? formatDistanceToNow(purchaseDate, { addSuffix: true })
            : 'Unknown date',
          purchaseId: purchase.id,
        };
      });
      setNotifications(notificationsData);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  // Fetch Recent Activities and Purchases (placeholder)
  useEffect(() => {
    // Fetch recent activities (placeholder)
    const fetchRecentActivities = () => {
      // Replace with actual data fetching
      setRecentActivities([
        { id: 1, activity: 'Order #1024 was placed.' },
        { id: 2, activity: 'Product XYZ was added to inventory.' },
        { id: 3, activity: 'Client Y updated their contact information.' },
        { id: 4, activity: 'Invoice #457 was generated.' },
        { id: 5, activity: 'Refund processed for Order #1020.' },
        { id: 6, activity: 'Email campaign sent to subscribers.' },
        { id: 7, activity: 'Scheduled meeting with Supplier Z.' },
        // Add more activities as needed
      ]);
    };

    // Fetch purchases (placeholder)
    const fetchPurchases = () => {
      // Replace with actual data fetching
      setPurchases([
        { id: 1, client: 'Client A', amount: '$200' },
        { id: 2, client: 'Client B', amount: '$150' },
        { id: 3, client: 'Client C', amount: '$350' },
        { id: 4, client: 'Client D', amount: '$400' },
        { id: 5, client: 'Client E', amount: '$250' },
        { id: 6, client: 'Client F', amount: '$500' },
        { id: 7, client: 'Client G', amount: '$100' },
        // Add more purchases as needed
      ]);
    };

    fetchRecentActivities();
    fetchPurchases();
  }, []);

  // Pagination handlers
  const handleNotificationsPageChange = (direction) => {
    setNotificationsPage((prevPage) => prevPage + direction);
  };

  const handleActivitiesPageChange = (direction) => {
    setActivitiesPage((prevPage) => prevPage + direction);
  };

  const handlePurchasesPageChange = (direction) => {
    setPurchasesPage((prevPage) => prevPage + direction);
  };

  // Calculate paginated data
  const paginatedNotifications = notifications.slice(
    (notificationsPage - 1) * itemsPerPage,
    notificationsPage * itemsPerPage
  );

  const paginatedActivities = recentActivities.slice(
    (activitiesPage - 1) * itemsPerPage,
    activitiesPage * itemsPerPage
  );

  const paginatedPurchases = purchases.slice(
    (purchasesPage - 1) * itemsPerPage,
    purchasesPage * itemsPerPage
  );

  // Determine if there are more pages
  const notificationsTotalPages = Math.ceil(
    notifications.length / itemsPerPage
  );
  const activitiesTotalPages = Math.ceil(
    recentActivities.length / itemsPerPage
  );
  const purchasesTotalPages = Math.ceil(purchases.length / itemsPerPage);

  const handleNotificationClick = (purchaseId, amount) => {
    setSelectedPurchaseId(purchaseId); // Set the selected purchase ID
    setTotalAmountDue(amount); // Set the total amount due
    setIsPaymentModalOpen(true); // Open the payment modal
  };
  

  const handleViewImageClick = (imageUrl) => {
    setSelectedProductImage(imageUrl);
    setIsImageModalOpen(true);
  };

  return (
    <div className="p-4">

      {/* Top Section */}
      <div className="flex flex-col md:flex-row justify-between items-start">
        {/* Left Side: Welcome Message and Clock */}
        <div className="flex flex-col space-y-4">
          {/* Welcome Message */}
          <ReactTypingEffect
            text={['Welcome Back!']}
            className="text-3xl font-semibold text-gray-800"
            speed={100}
            eraseDelay={1000000}
            typingDelay={500}
          />
          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-100 text-green-700 p-2 mb-4 rounded-md">
              {successMessage}
            </div>
          )}

          {/* Clock Section */}
          <div className="bg-gray-800 text-white p-5 rounded-lg shadow-md">
            <h2 className="text-lg font-semibold">Current Time</h2>
            <p id="clock" className="text-2xl mt-2">
              {currentTime}
            </p>
          </div>
        </div>


        {/* Notifications Section */}
        <div className="md:w-2/3 bg-white p-6 rounded-lg shadow-md max-h-[400px] overflow-y-auto mt-4 md:mt-0 transform translate-x-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FaBell className="text-yellow-500 text-2xl" />
              <h2 className="text-xl font-semibold">Notifications</h2>
            </div>
            <span className="text-sm text-gray-500">
              {new Date().toLocaleDateString()}
            </span>
          </div>
          {paginatedNotifications.length > 0 ? (
            <>
              <ul className="space-y-4 mt-4">
                {paginatedNotifications.map((notification) => (
                  <li
                    key={notification.id}
                    className="bg-gray-50 p-4 rounded-lg shadow hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start">
                      <FaExclamationCircle className="text-red-500 text-2xl mt-1" />
                      <div className="ml-4 flex-1">
                        <p className="text-gray-800 font-medium">
                          <span className="font-bold">
                            {notification.clientName}
                          </span>{' '}
                          owes{' '}
                          <span className="text-red-600 font-bold">
                            ${notification.amount}
                          </span>{' '}
                          for{' '}
                          <span className="font-semibold">
                            {notification.productName}
                          </span>
                          .
                        </p>
                        <p className="text-sm text-gray-500">
                          {notification.timeAgo}
                        </p>
                        <div className="flex space-x-2 mt-2">
                          <button
                            onClick={() =>
                              handleNotificationClick(notification.purchaseId, notification.amount)
                            }
                            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Add Payment
                          </button>
                          {notification.productImage && (
                            <button
                              onClick={() =>
                                handleViewImageClick(notification.productImage)
                              }
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center space-x-1"
                            >
                              <FaImage />
                              <span>View Image</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {/* Pagination Controls */}
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => handleNotificationsPageChange(-1)}
                  disabled={notificationsPage === 1}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${notificationsPage === 1
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => handleNotificationsPageChange(1)}
                  disabled={notificationsPage === notificationsTotalPages}
                  className={`px-3 py-1 rounded-lg text-sm font-medium ${notificationsPage === notificationsTotalPages
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500 mt-4">No new notifications.</p>
          )}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="flex gap-4 mt-6">
        <button
          onClick={() => setIsClientModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 flex items-center space-x-2 rounded-lg shadow"
        >
          <FaUserPlus />
          <span>Add New Customer</span>
        </button>
        <button
          onClick={() => setIsPurchaseModalOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 flex items-center space-x-2 rounded-lg shadow"
        >
          <FaShoppingCart />
          <span>Create New Order</span>
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
            {/* Add more product items as needed */}
          </div>
        </div>

        {/* Recent Activities Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Recent Activities</h2>
          {paginatedActivities.length > 0 ? (
            <>
              <ul className="space-y-2">
                {paginatedActivities.map((activity) => (
                  <li key={activity.id} className="text-gray-700">
                    {activity.activity}
                  </li>
                ))}
              </ul>
              {/* Pagination Controls */}
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={() => handleActivitiesPageChange(-1)}
                  disabled={activitiesPage === 1}
                  className={`px-2 py-1 rounded ${activitiesPage === 1
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => handleActivitiesPageChange(1)}
                  disabled={activitiesPage === activitiesTotalPages}
                  className={`px-2 py-1 rounded ${activitiesPage === activitiesTotalPages
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500">No recent activities.</p>
          )}
        </div>
      </div>

      {/* Additional Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {/* Purchases This Month */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-bold mb-4">Purchases This Month</h2>
          {paginatedPurchases.length > 0 ? (
            <>
              <ul className="space-y-2">
                {paginatedPurchases.map((purchase) => (
                  <li key={purchase.id} className="flex justify-between">
                    <span>{purchase.client}</span>
                    <span>{purchase.amount}</span>
                  </li>
                ))}
              </ul>
              {/* Pagination Controls */}
              <div className="flex justify-end space-x-2 mt-2">
                <button
                  onClick={() => handlePurchasesPageChange(-1)}
                  disabled={purchasesPage === 1}
                  className={`px-2 py-1 rounded ${purchasesPage === 1
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  Previous
                </button>
                <button
                  onClick={() => handlePurchasesPageChange(1)}
                  disabled={purchasesPage === purchasesTotalPages}
                  className={`px-2 py-1 rounded ${purchasesPage === purchasesTotalPages
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <p className="text-gray-500">No purchases this month.</p>
          )}
        </div>

        {/* Weekly Summary Section */}
        <div className="bg-white p-6 rounded-lg shadow-md">
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
      {isPaymentModalOpen && (
        <AddPaymentModal
          purchaseId={selectedPurchaseId}
          totalAmountDue={totalAmountDue}
          onClose={() => setIsPaymentModalOpen(false)}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(''), 3000);
            fetchNotifications(); // Refresh notifications after payment
          }}
        />
      )}
      {isImageModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Background Overlay */}
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setIsImageModalOpen(false)}
          ></div>
          {/* Modal Content */}
          <div className="bg-white p-3 rounded-lg shadow-lg z-10 max-w-xs w-11/12">
            {/* Image */}
            <img
              src={selectedProductImage}
              alt="Product"
              className="w-full h-auto rounded-md max-h-[500px] object-contain"
            />
            {/* Close Button */}
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainPage;
