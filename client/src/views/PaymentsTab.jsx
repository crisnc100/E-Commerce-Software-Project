import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import { FaEye, FaFilter } from 'react-icons/fa';

const PaymentsTab = () => {
  const [payments, setPayments] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [filterMethod, setFilterMethod] = useState('PayPal'); // Default to PayPal
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isImagesModalOpen, setIsImagesModalOpen] = useState(false);
  const [modalImages, setModalImages] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch payments from API
  const fetchPayments = async (page, method) => {
    setIsLoading(true);
    try {
      const response = await apiService.getPaginatedPayments(page, 10, method);
      const { items, total } = response.data;
      console.log('Fetched Payments:', items);

      setPayments((prevPayments) => {
        const existingIds = prevPayments.map((p) => p.payment_id);
        const newPayments = items.filter((payment) => !existingIds.includes(payment.payment_id));
        return [...prevPayments, ...newPayments];
      });

      setTotalPayments(total);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Load more payments
  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPayments(nextPage, filterMethod);
  };

  // Handle filter change
  const handleFilterChange = (method) => {
    setFilterMethod(method);
    setPage(1);
    setPayments([]); // Clear existing payments for new filter
    fetchPayments(1, method);
  };

  // Open product modal
  const handleViewImages = (payment) => {
    setSelectedProduct(payment); // Set the selected product details for the modal
    setModalImages(payment.product_photos || []); // Set the images for the carousel
    setIsImagesModalOpen(true); // Open the modal
    setCurrentIndex(0); // Start with the first image
  };


  const handleCloseImagesModal = () => {
    setIsImagesModalOpen(false);
    setModalImages([]);
    setCurrentIndex(0);
  };

  const handleNextImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % modalImages.length);
  };

  const handlePrevImage = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + modalImages.length) % modalImages.length);
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
    return date.toLocaleDateString('en-US', { timeZoneName: 'short' }); // Add time zone abbreviation
  };

  useEffect(() => {
    fetchPayments(page, filterMethod);
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Recent Payments</h1>
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded ${filterMethod === 'PayPal' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'} transition`}
            onClick={() => handleFilterChange('PayPal')}
          >
            PayPal Payments
          </button>
          <button
            className={`px-4 py-2 rounded ${filterMethod === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'} transition`}
            onClick={() => handleFilterChange('all')}
          >
            All Payments
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {payments.map((payment) => (
          <div key={payment.payment_id} className="p-4 border rounded shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center">
              {payment.product_photos?.length === 1 ? (
                <img
                 
                />
              ) : payment.product_photos?.length > 1 && (
                <img
                  
                />
              )}
              <div className="flex-1">
                <h2 className="font-bold text-xl">{`${payment.client_name}`}</h2>
                <p className="text-base text-gray-600">
                  Paid <span className="font-bold">${parseFloat(payment.amount_paid).toFixed(2)}</span> for order #{`${payment.purchase_id}`}
                  <span className="font-semibold">{payment.product_name}</span>
                </p>
                <p className="text-base text-gray-500">
                  Transaction Date: <span className="font-medium">{formatDateSafely(payment.payment_date)}</span>
                </p>
                <button
                  className="text-blue-600 hover:underline mt-2 flex items-center"
                  onClick={() => handleViewImages(payment)} // Use handleViewImages for modal
                >
                  <FaEye className="mr-1" /> View Product Details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      {payments.length < totalPayments && (
        <div className="flex justify-center mt-4">
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            onClick={handleLoadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Loading...' : 'Load More'}
          </button>
        </div>
      )}

      {isImagesModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={handleCloseImagesModal}
          ></div>
          <div className="bg-white p-3 rounded-lg shadow-lg z-10 max-w-xs sm:max-w-md md:max-w-lg w-11/12 relative">
            <img
              src={modalImages[currentIndex]}
              alt="Product"
              className="w-full h-auto rounded-md max-h-[500px] object-contain"
            />
            {modalImages.length > 1 && (
              <div className="flex justify-between items-center mt-2">
                <button
                  onClick={handlePrevImage}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Prev
                </button>
                <button
                  onClick={handleNextImage}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Next
                </button>
              </div>
            )}
              {/* Product Details */}
              <div className="text-center">
              <h2 className="text-lg font-bold">{selectedProduct.product_name}</h2>
              <p className="text-base text-gray-600 mt-2">
                Paid <span className="font-bold">${parseFloat(selectedProduct.amount_paid).toFixed(2)}</span>
              </p>
              <p className="text-base text-gray-600">
                Transaction Date: <span className="font-medium">{formatDateSafely(selectedProduct.payment_date)}</span>
              </p>
            </div>
            <button
              onClick={handleCloseImagesModal}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsTab;
