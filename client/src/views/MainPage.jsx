import React, { useEffect, useState } from 'react';
import {
  FaUserPlus,
  FaShoppingCart,
  FaBell,
  FaExclamationCircle,
  FaImage,
  FaTruck,
  FaEyeSlash,
  FaEye,
  FaChevronUp,
  FaChevronDown
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

  const [isActivitiesHidden, setIsActivitiesHidden] = useState(false);
  const [isActivitiesCollapsed, setIsActivitiesCollapsed] = useState(false);
  // Pagination states
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [purchasesPage, setPurchasesPage] = useState(1);
  const [timeSpan, setTimeSpan] = useState(3); // Default: 72 hours

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
  // Fetch both overdue purchases and pending deliveries
  const fetchNotifications = async () => {
    try {
      const [overdueResponse, pendingDeliveriesResponse] = await Promise.all([
        apiService.getOverduePurchases(),
        apiService.getLatePendingDeliveries(),
      ]);

      const overduePurchases = overdueResponse.data.map((purchase) => ({
        id: purchase.id,
        type: 'overdue', // Notification type for overdue purchases
        clientName: `${purchase.client_first_name} ${purchase.client_last_name}`,
        amount: purchase.amount,
        productName: purchase.product_name,
        productImage: purchase.product_screenshot_photo,
        timeAgo: purchase.purchase_date
          ? formatDistanceToNow(new Date(purchase.purchase_date), {
            addSuffix: true,
          })
          : 'Unknown date',
      }));

      const pendingDeliveries = pendingDeliveriesResponse.data.pending_deliveries.map(
        (delivery) => ({
          id: delivery.id,
          type: 'pending', // Notification type for pending deliveries
          clientName: `${delivery.client_first_name} ${delivery.client_last_name}`,
          productName: delivery.product_name,
          productImage: delivery.product_screenshot_photo,
          timeAgo: delivery.purchase_date
            ? formatDistanceToNow(new Date(delivery.purchase_date), {
              addSuffix: true,
            })
            : 'Unknown date',
        })
      );

      setNotifications([...overduePurchases, ...pendingDeliveries]);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);


  const handleMarkAsDelivered = async (purchaseId) => {
    try {
      await apiService.updatePurchaseShipping(purchaseId, 'Delivered');
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== purchaseId)
      );
      alert('Purchase marked as delivered!');
    } catch (error) {
      console.error('Error marking as delivered:', error);
      alert('Failed to mark as delivered. Please try again.');
    }
  };

  const fetchRecentActivities = async () => {
    try {
      const response = await apiService.getRecentActivities(timeSpan);
      setRecentActivities(response.data.recent_activities);
      setActivitiesPage(1); // Reset to the first page on time span change
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      setRecentActivities([]);
    }
  };

  useEffect(() => {
    fetchRecentActivities();
  }, [timeSpan]);

  // Load preferences from local storage on mount
  useEffect(() => {
    const storedHidden = localStorage.getItem('activitiesHidden');
    const storedCollapsed = localStorage.getItem('activitiesCollapsed');
    if (storedHidden === 'true') setIsActivitiesHidden(true);
    if (storedCollapsed === 'true') setIsActivitiesCollapsed(true);
  }, []);


  // Fetch purchases (placeholder)
  /*const fetchPurchases = () => {
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

  fetchPurchases();
}, []);*/

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
  const activitiesTotalPages = Math.ceil(recentActivities.length / itemsPerPage);

  const isTableView = timeSpan === 14; // Use table view for 14 days

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

  const formatDateSafely = (dateString) => {
    if (!dateString) return 'Unknown Date';

    const date = new Date(dateString);
    const correctedDate = new Date(
      date.getTime() + date.getTimezoneOffset() * 60000
    );

    return correctedDate.toLocaleString(); // Includes both date and time
  };

  // Toggle hide activities
  const handleHideActivities = () => {
    setIsActivitiesHidden(true);
    localStorage.setItem('activitiesHidden', 'true');
  };

  const handleRestoreActivities = () => {
    setIsActivitiesHidden(false);
    localStorage.removeItem('activitiesHidden');
  };

  // Toggle collapse
  const handleToggleCollapse = () => {
    const newState = !isActivitiesCollapsed;
    setIsActivitiesCollapsed(newState);
    if (newState) {
      localStorage.setItem('activitiesCollapsed', 'true');
    } else {
      localStorage.removeItem('activitiesCollapsed');
    }
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
        <div className="md:w-2/3 bg-white p-6 rounded-lg shadow-md max-h-[400px] overflow-y-auto">
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
                      {notification.type === 'overdue' ? (
                        <FaExclamationCircle className="text-red-500 text-2xl mt-1" />
                      ) : (
                        <FaTruck className="text-green-500 text-2xl mt-1" />
                      )}
                      <div className="ml-4 flex-1">
                        <p className="text-gray-800 font-medium">
                          {notification.type === 'overdue' ? (
                            <>
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
                            </>
                          ) : (
                            <>
                              <span className="font-bold">
                                {notification.clientName}
                              </span>{' '}
                              has an undelivered order for{' '}
                              <span className="font-semibold">
                                {notification.productName}
                              </span>. Has this order been delivered?
                            </>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">
                          {notification.type === 'overdue'
                            ? `Order was placed ${notification.timeAgo}`
                            : `Payment made ${notification.timeAgo}`}
                        </p>

                        <div className="flex space-x-2 mt-2">
                          {notification.type === 'overdue' && (
                            <button
                              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                              onClick={() =>
                                handleNotificationClick(notification.purchaseId, notification.amount)
                              }

                            >
                              Add Payment
                            </button>
                          )}

                          {notification.type === 'pending' && (
                            <button
                              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                              onClick={() => handleMarkAsDelivered(notification.id)}
                            >
                              Mark as Delivered
                            </button>
                          )}
                          {notification.productImage && (
                            <button
                              className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 flex items-center space-x-1"
                              onClick={() =>
                                handleViewImageClick(notification.productImage)
                              }
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
      {/* Recent Activities Section */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-4 max-h-[500px] overflow-y-auto">
        {!isActivitiesHidden ? (
          <div className="bg-white p-6 rounded-lg shadow-lg w-full">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-gray-800">Recent Activities</h2>
                <button
                  onClick={handleToggleCollapse}
                  className="text-gray-600 hover:text-gray-800 p-1 rounded focus:outline-none"
                  title={isActivitiesCollapsed ? 'Expand' : 'Collapse'}
                >
                  {isActivitiesCollapsed ? <FaChevronDown /> : <FaChevronUp />}
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <select
                  value={timeSpan}
                  onChange={(e) => setTimeSpan(Number(e.target.value))}
                  className="border rounded px-2 py-1 text-sm"
                >
                  <option value="3">Last 72 Hours</option>
                  <option value="7">Last 7 Days</option>
                  <option value="14">Last 14 Days</option>
                </select>

                <button
                  onClick={handleHideActivities}
                  className="text-gray-600 hover:text-gray-800 p-1 rounded focus:outline-none"
                  title="Hide Recent Activities"
                >
                  <FaEyeSlash />
                </button>
              </div>
            </div>

            {/* Only show content if not collapsed */}
            {!isActivitiesCollapsed && (
              <>
                {recentActivities.length > 0 ? (
                  <div className="max-h-[300px] overflow-y-auto">
                    <ul className="divide-y divide-gray-200">
                      {paginatedActivities.map((activity, index) => (
                        <li
                          key={index}
                          className="flex items-start p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-shadow"
                        >
                          <div className="flex-shrink-0 mr-4 text-2xl">
                            {activity.action === 'Add Client' && '👤'}
                            {activity.action === 'Add Product' && '📦'}
                            {activity.action === 'Create Purchase Order' && '🛒'}
                            {activity.action === 'Payment Made' && '💳'}
                            {activity.action.includes('Shipping') && '🚚'}
                          </div>

                          <div className="flex-1">
                            <p className="text-gray-800 font-semibold text-lg">
                              {activity.action}
                            </p>
                            <p className="text-gray-700 text-sm">{activity.details}</p>
                            <p className="text-gray-500 text-xs mt-2">
                              {formatDateSafely(activity.created_at)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent activities.</p>
                )}

                {recentActivities.length > 0 && (
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-sm text-gray-600">
                      Page {activitiesPage} of {activitiesTotalPages}
                    </p>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleActivitiesPageChange(-1)}
                        disabled={activitiesPage === 1}
                        className={`px-4 py-2 text-sm font-medium rounded-lg ${activitiesPage === 1
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handleActivitiesPageChange(1)}
                        disabled={activitiesPage === activitiesTotalPages}
                        className={`px-4 py-2 text-sm font-medium rounded-lg ${activitiesPage === activitiesTotalPages
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                          }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-lg w-full flex justify-center">
            <button
              onClick={handleRestoreActivities}
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              <FaEye />
              <span>Restore Recent Activities</span>
            </button>
          </div>
        )}
      </div>

      {/* Additional Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
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
