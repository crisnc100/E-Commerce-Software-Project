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
  FaChevronDown,
  FaChartLine,
  FaDollarSign,
  FaEquals,
  FaMedal,
  FaLink
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
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedPurchaseId, setSelectedPurchaseId] = useState(null);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [selectedProductImage, setSelectedProductImage] = useState('');
  const [totalAmountDueDash, setTotalAmountDueDash] = useState(null);
  const [clientId, setClientId] = useState(null);

  const [isActivitiesHidden, setIsActivitiesHidden] = useState(false);
  const [isActivitiesCollapsed, setIsActivitiesCollapsed] = useState(false);
  // Pagination states
  const [notificationsPage, setNotificationsPage] = useState(1);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const [timeSpan, setTimeSpan] = useState(3); // Default: 72 hour
  const itemsPerPage = 5;
  const [metrics, setMetrics] = useState({
    new_clients: 0,
    gross_sales: 0,
    revenue_earned: 0,
    net_sales: 0,
  });
  const [timeMetricSpan, setTimeMetricSpan] = useState('week'); // 'week' or 'month'
  const [isLoading, setIsLoading] = useState(true);

  const [category, setCategory] = useState('orders');
  const [topProducts, setTopProducts] = useState([]);
  const [isLoadingLink, setIsLoadingLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingLinks, setLoadingLinks] = useState({});




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
        clientId: purchase.client_id,
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

  const handleGetPayPalLink = async (notificationId) => {
    setLoadingLinks((prev) => ({ ...prev, [notificationId]: true })); // Set loading for the specific notification
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await apiService.regeneratePayPalLink(notificationId);
      const { paypal_link } = response.data;

      navigator.clipboard.writeText(paypal_link); // Copy link to clipboard
      setSuccessMessage(`PayPal link created and copied to clipboard!`);
      setTimeout(() => setSuccessMessage(''), 3000); // Clear success message after 3 seconds
    } catch (err) {
      console.error(`Error generating PayPal link for notification ${notificationId}:`, err);
      setErrorMessage(`Failed to generate PayPal link for notification ${notificationId}. Please try again.`);
      setTimeout(() => setErrorMessage(''), 4000); // Clear error message after 3 seconds
    } finally {
      setLoadingLinks((prev) => ({ ...prev, [notificationId]: false })); // Reset loading state for the specific notification
    }
  };




  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        const response = await apiService.getTopProducts(
          new Date().getFullYear(),
          new Date().getMonth() + 1,
          category
        );
        setTopProducts(response.data.top_products);
      } catch (error) {
        console.error('Error fetching top products:', error);
      }
    };

    fetchTopProducts();
  }, [category]);

  const productsByRank = topProducts.reduce((acc, product) => {
    if (!acc[product.rank]) {
      acc[product.rank] = [];
    }
    acc[product.rank].push(product);
    return acc;
  }, {});

  // We only want top 3 ranks
  const sortedRanks = Object.keys(productsByRank)
    .map(Number)
    .sort((a, b) => a - b)
    .slice(0, 3); // just the top 3 ranks


  const medalStyles = {
    1: 'text-yellow-500', // Gold
    2: 'text-gray-400',   // Silver
    3: 'text-[#cd7f32]',  // Bronze
  };

  const rankLabels = {
    1: '1st Place',
    2: '2nd Place',
    3: '3rd Place',
  };

  const handleMarkAsDelivered = async (purchaseId) => {
    try {
      await apiService.updatePurchaseShipping(purchaseId, 'Delivered');
      setNotifications((prev) =>
        prev.filter((notification) => notification.id !== purchaseId)
      );
      setSuccessMessage('Order marked as delivered!');

      // Clear the success message after 3 seconds
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
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


  // Fetch metrics based on time span
  const fetchMetrics = async () => {
    try {
      setIsLoading(true);
      const response = timeMetricSpan === 'week'
        ? await apiService.getWeeklyMetrics()
        : await apiService.getMonthlyMetrics();

      if (timeMetricSpan === 'week') {
        // Weekly data is straightforward
        setMetrics({
          new_clients: response.data.new_clients,
          gross_sales: response.data.weekly_metrics.gross_sales,
          revenue_earned: response.data.weekly_metrics.revenue_earned,
          net_sales: response.data.weekly_metrics.net_sales,
        });
      } else {
        // Monthly data needs extraction
        const currentMonth = new Date().getMonth() + 1; // Current month number (1-12)
        const currentMonthMetrics = response.data.monthly_metrics.find(m => m.month === currentMonth) || {};
        const currentMonthClientsObj = response.data.new_clients_by_month.find(m => m.month === currentMonth) || {};

        setMetrics({
          new_clients: currentMonthClientsObj.new_clients || 0,
          gross_sales: currentMonthMetrics.gross_sales || 0,
          revenue_earned: currentMonthMetrics.revenue_earned || 0,
          net_sales: currentMonthMetrics.net_sales || 0,
        });
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, [timeMetricSpan]);

  // Pagination handlers
  const handleNotificationsPageChange = (direction) => {
    setNotificationsPage((prevPage) => prevPage + direction);
  };

  const handleActivitiesPageChange = (direction) => {
    setActivitiesPage((prevPage) => prevPage + direction);
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


  // Determine if there are more pages
  const notificationsTotalPages = Math.ceil(
    notifications.length / itemsPerPage
  );
  const activitiesTotalPages = Math.ceil(recentActivities.length / itemsPerPage);

  const isTableView = timeSpan === 14; // Use table view for 14 days

  const handleNotificationClick = (purchaseId, amount, clientId) => {
    if (!purchaseId) {
      console.error("purchaseId is undefined or null");
      return;
    }
    setSelectedPurchaseId(purchaseId);
    setTotalAmountDueDash(amount);
    setClientId(clientId); // Ensure clientId is also being passed and set correctly
    setIsPaymentModalOpen(true);
  };



  const handleViewImageClick = (imageUrl) => {
    setSelectedProductImage(imageUrl);
    setIsImageModalOpen(true);
  };

  const formatDateSafely = (dateString) => {
    if (!dateString) return 'Unknown Date';

    const date = new Date(dateString);

    // Ensure the date is valid
    if (isNaN(date)) {
      console.error(`Invalid date: ${dateString}`);
      return 'Unknown Date';
    }

    // Format the date to the user's local time
    return date.toLocaleString('en-US', { timeZoneName: 'short' }); // Add time zone abbreviation
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
                            <>
                              {/* Add Payment Button */}
                              <button
                                className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700"
                                onClick={() =>
                                  handleNotificationClick(notification.id, notification.amount, notification.clientId)
                                }
                              >
                                Add Payment
                              </button>

                              {/* Get PayPal Link Button */}
                              <button
                                className={`px-3 py-1 flex items-center ${loadingLinks[notification.id] ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                                  } text-white rounded transition-all`}
                                onClick={() => handleGetPayPalLink(notification.id)}
                                disabled={loadingLinks[notification.id]} // Disable only the clicked button
                              >
                                {loadingLinks[notification.id] ? (
                                  <span className="loader mr-2"></span> // Optional: Add a small loader animation here
                                ) : (
                                  <FaLink className="mr-1" />
                                )}
                                {loadingLinks[notification.id] ? 'Loading...' : 'Get PayPal Link'}
                              </button>

                            </>
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

            {!isActivitiesCollapsed && (
              <>
                {recentActivities.length > 0 ? (
                  <>
                    {!isTableView ? (
                      <div className="max-h-[300px] overflow-y-auto">
                        <ul className="divide-y divide-gray-200">
                          {paginatedActivities.map((activity, index) => (
                            <li
                              key={index}
                              className="flex items-start p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-shadow"
                            >
                              <div className="flex-shrink-0">
                                {activity.action === 'Add Client' && (
                                  <span className="text-blue-500 text-2xl">👤</span>
                                )}
                                {activity.action === 'Add Product' && (
                                  <span className="text-purple-500 text-2xl">📦</span>
                                )}
                                {activity.action === 'Create Purchase Order' && (
                                  <span className="text-orange-500 text-2xl">🛒</span>
                                )}
                                {activity.action === 'Payment Made' && (
                                  <span className="text-green-500 text-2xl">💳</span>
                                )}
                                {activity.action.includes('Shipping') && (
                                  <span className="text-yellow-500 text-2xl">🚚</span>
                                )}
                              </div>

                              <div className="ml-4 flex-1">
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
                      <div className="max-h-[300px] overflow-y-auto">
                        <table className="min-w-full bg-white rounded-lg shadow-md">
                          <thead>
                            <tr>
                              <th className="py-2 px-4 border-b">Action</th>
                              <th className="py-2 px-4 border-b">Details</th>
                              <th className="py-2 px-4 border-b">Timestamp</th>
                            </tr>
                          </thead>
                          <tbody>
                            {paginatedActivities.map((activity, index) => (
                              <tr key={index} className="hover:bg-gray-100">
                                <td className="py-2 px-4">{activity.action}</td>
                                <td className="py-2 px-4">{activity.details}</td>
                                <td className="py-2 px-4 text-sm text-gray-500">
                                  {formatDateSafely(activity.created_at)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
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
                ) : (
                  <p className="text-gray-500 text-center py-4">No recent activities.</p>
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
      {/* Toggle for Time Span */}
      <div className="flex justify-end mb-6">
        <select
          value={timeMetricSpan}
          onChange={(e) => setTimeMetricSpan(e.target.value)}
          className="border rounded px-3 py-2 text-sm"
        >
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>
      </div>

      {/* Metrics Section */}
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-bold mb-4">
          {timeMetricSpan === 'week' ? 'Weekly Summary' : 'Monthly Summary'}
        </h2>
        {isLoading ? (
          <p>Loading metrics...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* New Clients */}
            <div className="flex flex-col items-center bg-gray-100 p-4 rounded-lg shadow">
              <FaUserPlus className="text-blue-500 text-3xl mb-2" />
              <h3 className="text-lg font-semibold">New Clients</h3>
              <p className="text-2xl font-bold text-blue-600">
                {metrics.new_clients || 0}
              </p>
            </div>

            {/* Gross Sales */}
            <div className="flex flex-col items-center bg-gray-100 p-4 rounded-lg shadow"
              title="Gross Sales: Total amount of all purchases before any costs.">
              <FaShoppingCart className="text-purple-500 text-3xl mb-2" />
              <h3 className="text-lg font-semibold">Gross Sales</h3>
              <p className="text-2xl font-bold text-purple-600">
                ${metrics.gross_sales?.toLocaleString() || '0'}
              </p>
            </div>


            {/* Revenue Earned */}
            <div className="flex flex-col items-center bg-gray-100 p-4 rounded-lg shadow"
              title="Revenue Earned: Gross Sales minus the product costs, indicating your profit margin.">
              <FaDollarSign className="text-green-500 text-3xl mb-2" />
              <h3 className="text-lg font-semibold">Revenue Earned</h3>
              <p className="text-2xl font-bold text-green-600">
                ${metrics.revenue_earned?.toLocaleString() || '0'}
              </p>
            </div>

            <div className="flex flex-col items-center bg-gray-100 p-4 rounded-lg shadow"
              title="Net Sales: The amount of money actually collected from fully paid orders.">
              <FaChartLine className="text-orange-500 text-3xl mb-2" />
              <h3 className="text-lg font-semibold">Net Sales</h3>
              <p className="text-2xl font-bold text-yellow-600">
                ${metrics.net_sales?.toLocaleString() || '0'}
              </p>
            </div>

          </div>
        )}
      </div>
      {/* Top Products Section */}
      <div className="bg-white p-6 rounded-lg shadow-md col-span-2">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">Top Products This Month</h2>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          >
            <option value="orders">Most Popular by Clients</option>
            <option value="sales">Most Popular by Sales</option>
          </select>
        </div>

        {sortedRanks.length === 0 ? (
          <div className="text-gray-500 text-center py-8">
            No data available for the selected category.
          </div>
        ) : (
          <div className="space-y-6">
            {sortedRanks.map((rank) => {
              const products = productsByRank[rank];
              const iconColor = medalStyles[rank] || 'text-gray-500';
              const label = rankLabels[rank] || `${rank}th Place`;
              return (
                <div key={rank}>
                  {/* Rank Heading */}
                  <div className="flex items-center mb-2">
                    <FaMedal className={`text-2xl mr-2 ${iconColor}`} />
                    <h3 className="text-xl font-semibold">
                      {label}
                      {products.length > 1 && (
                        <span className="ml-2 text-sm text-gray-600">
                          (tie)
                        </span>
                      )}
                    </h3>
                  </div>

                  {/* Products for this rank */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {products.map((product, idx) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-4 bg-gray-50 shadow-sm flex flex-col"
                      >

                        <div className="font-bold text-lg mb-1">
                          {product.product_name || 'Unnamed Product'}
                        </div>
                        <div className="text-sm text-gray-700">
                          {category === 'orders'
                            ? `Clients: ${product.total_orders}`
                            : `Orders: ${product.total_orders}`}
                        </div>
                        <div className="text-sm text-gray-700">
                          Total Sales: {product.total_sales > 0 ? `$${product.total_sales.toFixed(2)}` : '$0.00'}
                        </div>
                        <button
                          onClick={() => handleViewImageClick(product.product_screenshot_photo)}
                          className="flex items-center justify-center space-x-1 px-2 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          style={{ width: '60px' }} // Set a fixed width
                        >
                          <FaImage className="text-sm" />
                          <span className="text-sm">View</span>
                        </button>



                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      {
        isClientModalOpen && (
          <AddClientModal
            onClose={() => setIsClientModalOpen(false)}
            onSuccess={(message) => {
              setSuccessMessage(message);
              setTimeout(() => setSuccessMessage(''), 3000);
            }}
          />
        )
      }
      {
        isPurchaseModalOpen && (
          <AddPurchaseModal
            onClose={() => setIsPurchaseModalOpen(false)}
            onSuccess={(message) => {
              setSuccessMessage(message);
              setTimeout(() => setSuccessMessage(''), 3000);
            }}
          />
        )
      }
      {
        isPaymentModalOpen && (
          <AddPaymentModal
            purchaseId={selectedPurchaseId}
            clientId={clientId}
            totalAmountDueDash={totalAmountDueDash}
            onClose={() => setIsPaymentModalOpen(false)}
            onSuccess={(message) => {
              setSuccessMessage(message);
              setTimeout(() => setSuccessMessage(''), 3000);
              fetchNotifications(); // Refresh notifications after payment
            }}
          />
        )
      }
      {
        isImageModalOpen && (
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
        )
      }
    </div >
  );
};

export default MainPage;
