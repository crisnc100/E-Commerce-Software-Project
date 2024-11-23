import React, { useState } from 'react';
import apiService from '../services/apiService';

const AddPaymentModal = ({ purchaseId, onClose, onSuccess, totalAmountDue, clientId }) => {
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountPaid, setAmountPaid] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Credit Card');
  const [customPaymentMethod, setCustomPaymentMethod] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [warningMessage, setWarningMessage] = useState('');


  const validateFields = () => {
    const newErrors = {};
    if (!paymentDate) newErrors.paymentDate = 'Payment date is required.';
    if (!amountPaid || isNaN(amountPaid) || amountPaid <= 0) {
      newErrors.amountPaid = 'A valid payment amount is required.';
    } else if (parseFloat(amountPaid) < parseFloat(totalAmountDue || 0)) {
      setWarningMessage('The payment amount is less than the total due.');
    } else {
      setWarningMessage('');
    }

    if (!paymentMethod && customPaymentMethod.trim() === '') {
      newErrors.paymentMethod = 'Payment method is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAmountPaidChange = (e) => {
    const value = e.target.value;
    setAmountPaid(value);

    const amountDue = parseFloat(totalAmountDue || 0); // Safeguard totalAmountDue
    const paidAmount = parseFloat(value);

    if (!isNaN(amountDue) && paidAmount < amountDue) {
      setWarningMessage('Warning: The amount paid is less than the total amount due.');
    } else {
      setWarningMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateFields()) return;
    setIsLoading(true);

    const paymentData = {
        client_id: clientId,
        purchase_id: purchaseId,
        payment_date: paymentDate,
        amount_paid: parseFloat(amountPaid),
        payment_method: paymentMethod === 'Other' ? customPaymentMethod : paymentMethod,
    };

    try {
        // Create the payment
        await apiService.createPayment(paymentData);

        // Retrieve all payments for the current purchase
        const paymentsResponse = await apiService.getPaymentsByPurchaseId(purchaseId);
        const payments = paymentsResponse.data || [];

        // Calculate the total amount paid
        const totalAmountPaid = payments.reduce(
            (sum, payment) => sum + parseFloat(payment.amount_paid),
            0
        );

        // Compare with the total amount due
        let paymentStatus;
        if (totalAmountPaid >= totalAmountDue) {
            paymentStatus = 'Paid';
        } else if (totalAmountPaid > 0) {
            paymentStatus = 'Partial';
        } else {
            paymentStatus = 'Pending';
        }

        // Update the payment status
        await apiService.updatePurchaseStatus(purchaseId, { payment_status: paymentStatus });

        // Trigger success callback and close modal
        onSuccess('Payment added and status updated successfully!');
        onClose();
    } catch (error) {
        console.error('Error creating payment or updating status:', error);
    } finally {
        setIsLoading(false);
    }
};



  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Add Payment</h3>

        {/* Display Total Amount Due */}
        <div className="mb-4">
          <p className="font-semibold">
            Total Amount Due: ${totalAmountDue && !isNaN(totalAmountDue) ? Number(totalAmountDue).toFixed(2) : '0.00'}
          </p>

        </div>

        <form onSubmit={handleSubmit}>
          {/* Payment Date */}
          <label className="block mb-2 font-semibold">Payment Date</label>
          <input
            type="date"
            value={paymentDate}
            onChange={(e) => setPaymentDate(e.target.value)}
            className={`w-full p-2 border ${errors.paymentDate ? 'border-red-500' : 'border-gray-300'} rounded-lg mb-4`}
          />
          {errors.paymentDate && <p className="text-red-500 text-sm">{errors.paymentDate}</p>}

          {/* Amount Paid */}
          <label className="block mb-2 font-semibold">Amount Paid</label>
          <div className="flex items-center border border-gray-300 rounded-lg mb-2">
            <span className="px-3 bg-gray-200 text-gray-700">$</span>
            <input
              type="number"
              placeholder="Amount Paid"
              value={amountPaid}
              onChange={handleAmountPaidChange}
              className="w-full p-2 border-l border-gray-300 rounded-r-lg focus:outline-none"
            />
          </div>
          {warningMessage && <p className="text-yellow-500 text-sm mb-2">{warningMessage}</p>}
          {errors.amountPaid && <p className="text-red-500 text-sm">{errors.amountPaid}</p>}

          {/* Payment Method */}
          <label className="block mb-2 font-semibold">Payment Method</label>
          <div className="mb-4">
            {['Credit Card', 'PayPal', 'Venmo', 'Zelle', 'Bank Transfer', 'Other'].map((method) => (
              <label key={method} className="flex items-center mb-2">
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    if (e.target.value !== 'Other') {
                      setCustomPaymentMethod('');
                    }
                  }}
                  className="form-radio"
                />
                <span className="ml-2">{method}</span>
              </label>
            ))}
          </div>

          {/* Custom Payment Method */}
          {paymentMethod === 'Other' && (
            <div className="mb-4">
              <label className="block mb-2 font-semibold">Enter Payment Method</label>
              <input
                type="text"
                placeholder="Enter payment method"
                value={customPaymentMethod}
                onChange={(e) => setCustomPaymentMethod(e.target.value)}
                className={`w-full p-2 border ${errors.paymentMethod ? 'border-red-500' : 'border-gray-300'
                  } rounded-lg`}
              />
            </div>
          )}
          {errors.paymentMethod && <p className="text-red-500 text-sm">{errors.paymentMethod}</p>}

          {/* Buttons */}
          <div className="flex justify-end mt-6">
            <button
              type="button"
              onClick={onClose}
              className="mr-4 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              disabled={isLoading}
            >
              {isLoading ? 'Saving...' : 'Add Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPaymentModal;
