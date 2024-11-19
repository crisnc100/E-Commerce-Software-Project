import React, { useState } from 'react';
import apiService from '../services/apiService';

const AddPaymentModal = ({ purchaseId, onClose, onSuccess }) => {
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateFields = () => {
    const newErrors = {};
    if (!amountPaid || isNaN(amountPaid) || amountPaid <= 0)
      newErrors.amountPaid = 'Valid payment amount is required.';
    if (!paymentMethod) newErrors.paymentMethod = 'Payment method is required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateFields()) return;
    setIsLoading(true);

    const paymentData = {
      purchase_id: purchaseId,
      payment_date: new Date().toISOString().split('T')[0],
      amount_paid: parseFloat(amountPaid),
      payment_method: paymentMethod,
    };

    try {
      await apiService.createPayment(paymentData);
      onSuccess('Payment added successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating payment:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Add Payment</h2>
        <form onSubmit={handleSubmit}>
          <label className="block mb-2 font-semibold">Payment Amount</label>
          <input
            type="number"
            value={amountPaid}
            onChange={(e) => setAmountPaid(e.target.value)}
            placeholder="Enter payment amount"
            className={`w-full p-2 border ${
              errors.amountPaid ? 'border-red-500' : 'border-gray-300'
            } rounded-lg mb-4`}
          />
          {errors.amountPaid && (
            <p className="text-red-500 text-sm">{errors.amountPaid}</p>
          )}

          <label className="block mb-2 font-semibold">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className={`w-full p-2 border ${
              errors.paymentMethod ? 'border-red-500' : 'border-gray-300'
            } rounded-lg mb-4`}
          >
            <option value="">-- Select Payment Method --</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
          </select>
          {errors.paymentMethod && (
            <p className="text-red-500 text-sm">{errors.paymentMethod}</p>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-4 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isLoading}
            >
              {isLoading ? 'Adding...' : 'Add Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPaymentModal;
