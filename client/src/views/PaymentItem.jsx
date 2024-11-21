import React from 'react';

const PaymentItem = ({ payment }) => {
  if (!payment || !payment.payment_date || !payment.amount_paid || !payment.payment_method) {
    return null; // Do not render if payment data is invalid
  }

  // Correctly parse the payment date to avoid timezone issues
  const dateParts = payment.payment_date.split('-');
  const paymentDate = new Date(
    parseInt(dateParts[0]),
    parseInt(dateParts[1]) - 1,
    parseInt(dateParts[2])
  );

  return (
    <div className="border border-gray-200 rounded p-2 mb-2">
      <p>
        <strong>Payment Date:</strong> {paymentDate.toLocaleDateString()}
      </p>
      <p>
        <strong>Amount Paid:</strong> ${payment.amount_paid}
      </p>
      <p>
        <strong>Payment Method:</strong> {payment.payment_method}
      </p>
    </div>
  );
};

export default PaymentItem;
