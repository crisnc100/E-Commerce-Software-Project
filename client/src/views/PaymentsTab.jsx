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
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch payments from API
  const fetchPayments = async (page, method) => {
    setIsLoading(true);
    try {
      const response = await apiService.getPaginatedPayments(page, 12, method);
      const { items, total } = response.data;
      setPayments((prevPayments) => [...prevPayments, ...items]);
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
  const handleViewProduct = (product) => {
    setSelectedProduct(product);
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchPayments(page, filterMethod);
  }, []);

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Payments</h1>
        <div className="flex space-x-2">
          <button
            className={`px-4 py-2 rounded ${filterMethod === 'PayPal' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-800'} transition`}
            onClick={() => handleFilterChange('PayPal')}
          >
            PayPal
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
              {payment.product_name && payment.product_screenshot_photo && (
                <img
                  src={payment.product_screenshot_photo}
                  alt={payment.product_name}
                  className="w-16 h-16 rounded mr-4 object-cover"
                />
              )}
              <div className="flex-1">
                <h2 className="font-bold text-lg">{`${payment.first_name} ${payment.last_name}`}</h2>
                <p className="text-sm text-gray-600">{`Amount Paid: $${parseFloat(payment.amount_paid).toFixed(2)}`}</p>
                <p className="text-sm text-gray-500">{`Payment Date: ${payment.payment_date}`}</p>
                <button
                  className="text-blue-600 hover:underline mt-2 flex items-center"
                  onClick={() => handleViewProduct(payment)}
                >
                  <FaEye className="mr-1" /> View Product
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

      {/* Product Modal */}
      {isModalOpen && selectedProduct && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          {/* Background Overlay */}
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setIsModalOpen(false)}
          ></div>

          {/* Modal Content */}
          <div className="bg-white p-3 rounded-lg shadow-lg z-10 max-w-xs w-11/12">
            {/* Product Image */}
            {selectedProduct.product_screenshot_photo && (
              <img
                src={selectedProduct.product_screenshot_photo}
                alt={selectedProduct.product_name}
                className="w-full h-auto rounded-md max-h-[500px] object-contain mb-4"
              />
            )}

            {/* Product Details */}
            <div className="text-center">
              <h2 className="text-lg font-bold">{selectedProduct.product_name}</h2>
              <p className="text-sm text-gray-600 mt-2">
                Amount Paid: ${parseFloat(selectedProduct.amount_paid).toFixed(2)}
              </p>
              <p className="text-sm text-gray-600">
                Payment Date: {selectedProduct.payment_date}
              </p>
            </div>

            {/* Close Button */}
            <button
              onClick={() => setIsModalOpen(false)}
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
