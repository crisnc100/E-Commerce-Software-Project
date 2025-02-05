// src/components/Navbar.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiUpload, FiLock, FiUser, FiSettings } from 'react-icons/fi';
import { FaCheck, FaMagic, FaCopy, FaBars } from 'react-icons/fa';
import apiService from '../../services/apiService';
import UploadProductModal from '../UploadProductModal';
import { useCallback } from 'react';
import { debounce } from 'lodash';
import { Modal } from 'react-responsive-modal';



const Navbar = ({ role, sidebarToggle, setSidebarToggle }) => {

  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [searchType, setSearchType] = useState('product'); // 'product' or 'client'
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearchDropdownOpen, setIsSearchDropdownOpen] = useState(false);
  const [detailedResults, setDetailedResults] = useState([]);
  const [isDetailedViewOpen, setIsDetailedViewOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const searchDropdownRef = useRef(null);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedProductName, setSelectedProductName] = useState('');
  const [selectedClientName, setSelectedClientName] = useState('');
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageToShow, setImageToShow] = useState('');
  const [loadingLinks, setLoadingLinks] = useState({});
  const [hasCredentials, setHasCredentials] = useState(false); // Track PayPal credentials
  const [systemInfo, setSystemInfo] = useState(null); // Track full system info

  const [generatedLinks, setGeneratedLinks] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');



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

  // Debounce the search input to avoid excessive API calls
  // Debounce the search input to avoid excessive API calls
  const fetchSearchResults = async (term) => {
    setIsLoading(true);
    try {
      let response;
      if (searchType === 'product') {
        response = await apiService.searchProductsByName(term);
      } else if (searchType === 'client') {
        response = await apiService.searchClientsByName(term);
      }
      setSearchResults(response.data);
      setIsSearchDropdownOpen(true);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const debouncedFetchSearchResults = useCallback(
    debounce((term) => fetchSearchResults(term), 200),
    [searchType]
  );

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (!term) {
      setSearchResults([]);
      setIsSearchDropdownOpen(false);
      return;
    }

    debouncedFetchSearchResults(term);
  };

  const fetchDetailedResults = async (itemId, page = 1) => {
    try {
      setIsLoading(true);
      let response;

      if (searchType === 'product') {
        response = await apiService.allPurchasesByProductId(itemId, page);
      } else if (searchType === 'client') {
        response = await apiService.allPurchasesByClientId(itemId, page);
      }
      console.log('API Response:', response.data.items); // Log the response for debugging

      const itemsPerPage = 4;

      // Grouping logic for client purchases
      const groupedResults =
        searchType === 'client'
          ? response.data.items.map((item) => ({
            ...item,
            isOpen: false, // Default collapse state
          }))
          : response.data.items;

      setDetailedResults(groupedResults);
      setTotalPages(Math.ceil(response.data.total / itemsPerPage));
      setCurrentPage(page);
    } catch (error) {
      console.error('Failed to fetch detailed results:', error);
    } finally {
      setIsLoading(false);
    }
  };





  const handleSearchResultClick = async (result) => {
    setIsSearchDropdownOpen(false);
    setSelectedItemId(result.id);
    setDetailedResults([]);

    if (searchType === 'product') {
      setSelectedProductName(result.name);
      setSelectedClientName(''); // Clear the client name just in case
    } else if (searchType === 'client') {
      const fullName = `${result.first_name} ${result.last_name}`;
      setSelectedClientName(fullName);

      setSelectedProductName(''); // Clear the product name just in case
    }

    setIsDetailedViewOpen(true);
    await fetchDetailedResults(result.id, 1); // Start from the first page
  };

  useEffect(() => {
    const fetchSystemInfo = async () => {
      try {
        const response = await apiService.getSystemInfo();
        const system = response.data;

        setSystemInfo(system); // Store full system info
        // Check if credentials exist
        const credentialsExist = !!(system.paypal_client_id && system.paypal_secret);
        setHasCredentials(credentialsExist);
      } catch (error) {
        console.error("Failed to fetch system info:", error);
        setHasCredentials(false); // Default to false on error
      }
    };

    fetchSystemInfo();
  }, []);

  const handleGeneratePayPalLink = async (purchaseId) => {
    setLoadingLinks((prev) => ({ ...prev, [purchaseId]: true })); // Set loading for the specific notification
    setErrorMessage('');
    setSuccessMessage('');
    setGeneratedLinks((prev) => ({ ...prev, [purchaseId]: null })); // Clear existing link

    try {
      const response = await apiService.regeneratePayPalLink(purchaseId);
      const { paypal_link } = response.data;

      setGeneratedLinks((prev) => ({ ...prev, [purchaseId]: paypal_link })); // Store generated link
      setTimeout(() => {
        setGeneratedLinks((prev) => {
          const updatedLinks = { ...prev };
          delete updatedLinks[purchaseId];
          return updatedLinks;
        });
      }, 30000); // 30 seconds
      setSuccessMessage('PayPal link generated successfully! Please copy it using the button.');
      setTimeout(() => setSuccessMessage(''), 4000); // Clear success message after 3 seconds
    } catch (err) {
      console.error(`Error generating PayPal link for notification ${purchaseId}:`, err);
      setErrorMessage('Failed to generate PayPal link. Please try again.');
      setTimeout(() => setErrorMessage(''), 3000); // Clear error message after 3 seconds
    } finally {
      setLoadingLinks((prev) => ({ ...prev, [purchaseId]: false })); // Reset loading state for the specific notification
    }
  };

  const handleCopyToClipboard = async (paypalLink) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(paypalLink);
        setSuccessMessage('PayPal link copied to clipboard!');
      } else {
        throw new Error('Clipboard API not supported.');
      }
    } catch (err) {
      console.error('Error copying PayPal link:', err);
      setErrorMessage('Failed to copy PayPal link. Please try again.');
    } finally {
      setTimeout(() => setSuccessMessage(''), 3000); // Clear success message after 3 seconds
      setTimeout(() => setErrorMessage(''), 3000); // Clear error message after 3 seconds
    }
  };






  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        searchDropdownRef.current &&
        !searchDropdownRef.current.contains(event.target)
      ) {
        setIsSearchDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close detailed view when clicking outside
  useEffect(() => {
    const handleClickOutsideDetailedView = (event) => {
      if (
        detailedViewRef.current &&
        !detailedViewRef.current.contains(event.target)
      ) {
        setIsDetailedViewOpen(false);
      }
    };
    if (isDetailedViewOpen) {
      document.addEventListener('mousedown', handleClickOutsideDetailedView);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideDetailedView);
    };
  }, [isDetailedViewOpen]);

  const detailedViewRef = useRef(null);

  const formatDateSafely = (dateString) => {
    if (!dateString) return 'Unknown Date';

    const date = new Date(dateString);

    // Ensure the date is valid
    if (isNaN(date)) {
      console.error(`Invalid date: ${dateString}`);
      return 'Unknown Date';
    }

    // Format the date to the user's local time
    return date.toLocaleDateString('en-US'); // Add time zone abbreviation
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'text-yellow-600';
      case 'Overdue':
        return 'text-red-600';
      case 'Paid':
        return 'text-green-600';
      case 'Partial':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };


  return (
    <nav className="bg-gray-800 p-3 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between">
      {/* LEFT SECTION: Hamburger + (Optional Branding) */}
      <div className="flex items-center justify-between w-full md:w-auto">
        <FaBars
          onClick={() => setSidebarToggle(!sidebarToggle)}
          className="text-white cursor-pointer mr-3"
          size={26}
        />
      </div>

      {/* MIDDLE SECTION: SEARCH (Grows to fill space) */}
      <div
        className="flex-1 mx-2 md:mx-4 relative my-2 md:my-0"
        ref={searchDropdownRef}
      >
        <div className="flex space-x-2">
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="p-1 md:p-2 rounded-lg bg-gray-700 text-white focus:outline-none text-sm md:text-base"
          >
            <option value="product">Product</option>
            <option value="client">Client</option>
          </select>
          <input
            type="text"
            placeholder={`Search ${searchType}s...`}
            value={searchTerm}
            onChange={handleSearchChange}
            className="w-full p-1 md:p-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm md:text-base"
          />
        </div>

        {/* Search Dropdown */}
        {isSearchDropdownOpen && (
          <div className="absolute bg-white shadow-lg rounded-lg mt-2 w-full max-h-60 overflow-auto z-10">
            {isLoading && (
              <div className="p-2 text-center text-gray-500">Loading...</div>
            )}
            {!isLoading && searchResults.length === 0 && (
              <div className="p-2 text-center text-gray-500">
                No results found.
              </div>
            )}
            {!isLoading &&
              searchResults.map((result) => (
                <div
                  key={result.id}
                  className="p-2 hover:bg-gray-100 cursor-pointer flex items-center"
                  onClick={() => handleSearchResultClick(result)}
                >
                  {searchType === 'product' ? (
                    <>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setImageToShow(result.screenshot_photo || 'https://via.placeholder.com/150');
                          setIsImageModalOpen(true);
                        }}
                      >
                        <img
                          src={result.screenshot_photo}
                          alt={result.name}
                          className="w-10 h-10 mr-2 object-cover rounded"
                        />
                      </span>
                      <span>{result.name}</span>
                    </>
                  ) : (
                    <span>{`${result.first_name} ${result.last_name}`}</span>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>

      {/* RIGHT SECTION: Upload, Lock, Profile */}
      <div className="flex items-center space-x-2 md:space-x-4">
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center bg-blue-600 hover:bg-blue-700 text-white 
                   py-2 px-3 md:py-2 md:px-4 rounded-lg text-sm md:text-base"
        >
          <FiUpload className="mr-1" size={18} />
          {/* Show 'Upload' on small screens; 'Upload Product' on md+ screens */}
          <span className="inline md:hidden">Upload</span>
          <span className="hidden md:inline">Upload Product</span>
        </button>

        <button
          onClick={handleLogout}
          className="flex items-center bg-red-600 hover:bg-red-700 text-white 
                   py-2 px-3 md:py-2 md:px-4 rounded-lg text-sm md:text-base"
        >
          <FiLock className="mr-1" size={18} />
          {/* Show 'Lock' on small screens; 'Lock Software' on md+ screens */}
          <span className="inline md:hidden">Lock</span>
          <span className="hidden md:inline">Lock Software</span>
        </button>

        {/* Profile Button + Menu */}
        <div className="relative profile-menu">
          <button
            onClick={toggleProfileMenu}
            className="flex items-center bg-gray-700 text-white 
                     py-2 px-3 md:py-2 md:px-4 rounded-lg 
                     focus:outline-none text-sm md:text-base"
          >
            <FiUser className="mr-1" size={18} />
            <span className="hidden md:inline">Profile</span>
          </button>

          {isProfileMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg flex flex-col">
              <Link
                to="settings"
                className="block px-4 py-2 flex items-center text-gray-800 hover:bg-gray-200"
              >
                <FiSettings className="mr-1" /> Settings
              </Link>
              {role === 'admin' && (
                <Link
                  to="admin"
                  className="block px-4 py-2 flex items-center text-gray-800 hover:bg-gray-200"
                >
                  <FiUser className="mr-1" /> Admin
                </Link>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Product Modal */}
      {isUploadModalOpen && <UploadProductModal onClose={() => setIsUploadModalOpen(false)} />}

      {/* Image Modal  */}
      <Modal
        open={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        center
      >
        <img src={imageToShow} alt="Product" className="max-w-full max-h-screen rounded-lg h-auto" />
      </Modal>

      {/* Detailed View Modal */}
      {isDetailedViewOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-20"
          onClick={() => setIsDetailedViewOpen(false)}
        >
          <div
            className="bg-white p-6 rounded-lg max-w-lg w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            ref={detailedViewRef}
          >
            {/* Success Message */}
            {successMessage && (
              <div className="p-2 mb-4 bg-green-100 text-green-800 rounded shadow-md">
                {successMessage}
              </div>
            )}
            {/* Error Message */}
            {errorMessage && (
              <div className="p-2 mb-4 bg-red-100 text-red-800 rounded shadow-md">
                {errorMessage}
              </div>
            )}

            <h2 className="text-2xl font-bold mb-4 text-center">
              {searchType === 'product'
                ? (selectedProductName ? `Clients Who Purchased: ${selectedProductName}` : 'Clients Who Purchased This Product')
                : (selectedClientName ? (
                  <span
                    className="cursor-pointer text-blue-600"
                    onClick={() => {
                      navigate(`/dashboard/clients/${selectedItemId}/${selectedClientName.replace(' ', '-')}`);
                      setIsDetailedViewOpen(false);
                    }}
                  >
                    {`Products Purchased by ${selectedClientName}`}
                  </span>
                ) : 'Products Purchased by This Client')}
            </h2>


            <div className="overflow-y-auto" style={{ maxHeight: '65vh' }}>
              {isLoading ? (
                <div className="text-center text-gray-500">Loading...</div>
              ) : detailedResults.length === 0 ? (
                <div className="text-center text-gray-500">No data available.</div>
              ) : (
                <>
                  <ul className="space-y-4">
                    {detailedResults.map((item) => (
                      <li
                        key={`${item.id}-${item.purchase_date}`}
                        className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
                      >
                        {searchType === 'product' ? (
                          <div>
                            <h3
                              className="text-lg font-semibold cursor-pointer text-blue-600"
                              onClick={() => {
                                navigate(`/dashboard/clients/${item.client_id}/${item.first_name}-${item.last_name}`);
                                setIsDetailedViewOpen(false);
                              }}
                            >
                              {`${item.first_name} ${item.last_name}`} - Order {`#${item.purchase_id}`}
                            </h3>
                            <p className="text-sm text-gray-600 font-semibold">
                              Purchase Date: {formatDateSafely(item.purchase_date)}
                            </p>
                            <p className="text-sm text-gray-600 font-semibold">
                              Total Order Amount: ${parseFloat(item.amount).toFixed(2)}
                            </p>
                            <p className="text-sm text-gray-600 font-semibold">
                              Size: {item.size}
                            </p>
                            <p className="text-sm text-gray-600 font-semibold">
                              Quantity: {item.quantity}
                            </p>
                            <p className="text-sm text-gray-600 font-semibold">
                              Payment Status:{' '}
                              <span
                                className={`${getStatusColor(item.payment_status)} font-semibold`}
                              >
                                {item.payment_status}
                              </span>
                            </p>
                          </div>
                        ) : (
                          <div>
                            {item.items.length === 1 ? (
                              // Single-item order: Use the original UI format
                              <div className="flex items-center">
                                <img
                                  src={item.items[0].product_screenshot_photo}
                                  alt={item.items[0].product_name}
                                  className="w-20 h-22 mr-4 object-cover rounded"
                                />
                                <div>
                                  <h3 className="text-lg font-semibold text-blue-600">
                                    {item.items[0].product_name}
                                  </h3>
                                  <p className="text-sm text-gray-600 font-semibold">
                                    Purchase Date: {formatDateSafely(item.purchase_date)}
                                  </p>
                                  <p className="text-sm text-gray-600 font-semibold">
                                    Total Amount: ${parseFloat(item.amount).toFixed(2)}
                                  </p>
                                  <p className="text-sm text-gray-600 font-semibold">
                                    Payment Status:{' '}
                                    <span className={`${getStatusColor(item.payment_status)} font-semibold`}>
                                      {item.payment_status}
                                    </span>
                                  </p>
                                  <p className="text-sm text-gray-600 font-semibold">Size: {item.items[0].size}</p>
                                  <p className="text-sm text-gray-600 font-semibold">Quantity: {item.items[0].quantity}</p>
                                  {/* Generate PayPal Button for Single Item */}
                                  {hasCredentials && item.payment_status !== 'Paid' && (
                                    <div>
                                      {!generatedLinks[item.purchase_id] ? (
                                        <button
                                          className={`px-3 py-1 flex items-center ${loadingLinks[item.purchase_id]
                                            ? 'bg-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700'
                                            } text-white rounded transition-all mt-2`}
                                          onClick={() => handleGeneratePayPalLink(item.purchase_id)}
                                          disabled={loadingLinks[item.purchase_id]}
                                        >
                                          {loadingLinks[item.purchase_id] ? (
                                            <span className="loader mr-2"></span>
                                          ) : (
                                            <FaMagic className="mr-1" />
                                          )}
                                          {loadingLinks[item.purchase_id] ? 'Generating...' : 'Generate PayPal Link'}
                                        </button>
                                      ) : (
                                        <div className="flex items-center space-x-2">
                                          <FaCheck className="text-green-500 text-xl" aria-label="Link Generated" />
                                          <button
                                            className="px-3 py-1 flex items-center bg-green-600 hover:bg-green-700 text-white rounded transition-all"
                                            onClick={() => handleCopyToClipboard(generatedLinks[item.purchase_id], item.purchase_id)}
                                          >
                                            <FaCopy className="mr-1" />
                                            Copy Link
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              // Multi-item order: Use collapsible format
                              <div>
                                {/* Collapsible Order Header */}
                                <div
                                  className="cursor-pointer font-semibold text-blue-600 flex justify-between items-center"
                                  onClick={() =>
                                    setDetailedResults((prev) =>
                                      prev.map((o) =>
                                        o.purchase_id === item.purchase_id
                                          ? { ...o, isOpen: !o.isOpen }
                                          : o
                                      )
                                    )
                                  }
                                >
                                  <div>
                                    <p className="text-lg font-semibold">Order #{item.purchase_id}</p>
                                    <p className="text-sm text-gray-600">
                                      Purchase Date: {formatDateSafely(item.purchase_date)}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Total Amount: ${parseFloat(item.amount).toFixed(2)}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                      Payment Status:{' '}
                                      <span className={`${getStatusColor(item.payment_status)} font-semibold`}>
                                        {item.payment_status}
                                      </span>
                                    </p>
                                    {/* Generate PayPal Button for Multi-Item Order */}
                                    {hasCredentials && item.payment_status !== 'Paid' && (
                                      <div>
                                        {!generatedLinks[item.purchase_id] ? (
                                          <button
                                            className={`px-3 py-1 flex items-center ${loadingLinks[item.purchase_id]
                                              ? 'bg-gray-400 cursor-not-allowed'
                                              : 'bg-blue-600 hover:bg-blue-700'
                                              } text-white rounded transition-all mt-2`}
                                            onClick={() => handleGeneratePayPalLink(item.purchase_id)}
                                            disabled={loadingLinks[item.purchase_id]}
                                          >
                                            {loadingLinks[item.id] ? (
                                              <span className="loader mr-2"></span>
                                            ) : (
                                              <FaMagic className="mr-1" />
                                            )}
                                            {loadingLinks[item.purchase_id] ? 'Generating...' : 'Generate PayPal Link'}
                                          </button>
                                        ) : (
                                          <div className="flex items-center space-x-2">
                                            <FaCheck className="text-green-500 text-xl" aria-label="Link Generated" />
                                            <button
                                              className="px-3 py-1 flex items-center bg-green-600 hover:bg-green-700 text-white rounded transition-all"
                                              onClick={() => handleCopyToClipboard(generatedLinks[item.purchase_id], item.purchase_id)}
                                            >
                                              <FaCopy className="mr-1" />
                                              Copy Link
                                            </button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <span>{item.isOpen ? '-' : '+'}</span>
                                </div>
                                {/* Collapsible Product List */}
                                {item.isOpen && (
                                  <ul className="mt-4 space-y-2">
                                    {item.items.map((product) => (
                                      <li
                                        key={product.product_id}
                                        className="flex items-center p-2 border rounded shadow-sm"
                                      >
                                        <img
                                          src={product.product_screenshot_photo || '/placeholder.jpg'}
                                          alt={product.product_name || 'Unnamed Product'}
                                          className="w-16 h-16 mr-4 object-cover rounded"
                                        />
                                        <div>
                                          <h3 className="text-sm font-semibold">{product.product_name || 'Unnamed Product'}</h3>
                                          <p className="text-sm text-gray-600">Size: {product.size || 'N/A'}</p>
                                          <p className="text-sm text-gray-600">Quantity: {product.quantity || 'N/A'}</p>
                                        </div>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                  {/* Pagination Controls */}
                  < div className="flex justify-between items-center mt-4" >
                    <button
                      className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      onClick={() => currentPage > 1 && fetchDetailedResults(selectedItemId, currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                    <span>
                      Page {currentPage} of {totalPages}
                    </span>
                    <button
                      className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      onClick={() => currentPage < totalPages && fetchDetailedResults(selectedItemId, currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </div>

                </>
              )}

            </div>
          </div>
        </div>
      )}

    </nav>
  );
};

export default Navbar;
