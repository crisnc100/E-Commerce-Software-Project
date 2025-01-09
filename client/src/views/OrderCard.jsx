// OrderCard.jsx
import React, { useState, useEffect } from 'react';
import {
    FaAngleDown,
    FaAngleUp,
    FaPlus,
    FaEdit,
    FaTrash,
    FaTimes,
    FaSave,
    FaLink
} from 'react-icons/fa';
import PaymentItem from './PaymentItem';
import apiService from '../services/apiService';
import AddPaymentModal from './AddPaymentModal';

const OrderCard = ({ order, clientId, refreshData, removeOrder, remainingBalance }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedOrder, setEditedOrder] = useState(order);
    const [successMessage, setSuccessMessage] = useState('');
    const [selectedPurchaseId, setSelectedPurchaseId] = useState(order.id);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [deletePurchaseId, setDeletePurchaseId] = useState(null);
    const [deletePaymentId, setDeletePaymentId] = useState(null);
    const [isConfirmPaymentOpen, setIsConfirmPaymentOpen] = useState(false);
    const [editingPayment, setEditingPayment] = useState(null);
    const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
    const [isAmountIncreaseConfirmOpen, setIsAmountIncreaseConfirmOpen] = useState(false);
    const [isAmountDecreaseConfirmOpen, setIsAmountDecreaseConfirmOpen] = useState(false);
    const [pendingStatusChange, setPendingStatusChange] = useState(null);
    const [paypalLink, setPayPalLink] = useState('');
    const [isLoadingLink, setIsLoadingLink] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');








    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);

    const toggleExpand = () => {
        setIsExpanded(!isExpanded);
    };

    const handleAddPaymentClick = () => {
        setShowAddPaymentModal(true);
    };

    const handleImageClick = () => {
        setShowImageModal(true);
    };

    const handleEditOrderClick = () => {
        setIsEditing(true);
        setEditedOrder(order);
    };

    const handleSaveEdit = () => {
        const originalPaymentStatus = order.payment_status;
        const newPaymentStatus = editedOrder.payment_status;
        const originalAmount = parseFloat(order.amount);
        const newAmount = parseFloat(editedOrder.amount);

        // Prevent changing to 'Pending' or 'Overdue' if payments exist
        if (
            (newPaymentStatus === 'Pending' || newPaymentStatus === 'Overdue') &&
            order.payments &&
            order.payments.length > 0
        ) {
            setSuccessMessage(
                `Cannot change payment status to "${newPaymentStatus}" while payments exist.`
            );
            return;
        }

        // Prevent changing from 'Paid' to 'Partial' unless payments or amount are adjusted
        if (
            originalPaymentStatus === 'Paid' &&
            newPaymentStatus === 'Partial' &&
            originalAmount === newAmount &&
            order.payments &&
            order.payments.length > 0
        ) {
            setSuccessMessage(
                `Cannot change payment status to 'Partial' without adjusting payments or amount.`
            );
            return;
        }

        // Validate that total payments match the order amount when setting status to 'Paid'
        if (
            (newPaymentStatus === 'Paid' || newPaymentStatus === 'Partial') &&
            (!order.payments || order.payments.length === 0)
        ) {
            // Do not proceed with update yet; open Add Payment Modal
            setPendingStatusChange({ ...editedOrder });
            setShowAddPaymentModal(true);
            setEditedOrder(order); // Reset to original to prevent premature status change
            return;
        }

        // Check if amount increased and payments exist
        if (
            newAmount > originalAmount &&
            order.payments &&
            order.payments.length > 0
        ) {
            setIsAmountIncreaseConfirmOpen(true);
            return;
        }
        if (
            newAmount < originalAmount &&
            order.payments &&
            order.payments.length > 0
        ) {
            setIsAmountDecreaseConfirmOpen(true);
            return;
        }

        // Proceed with update
        proceedWithUpdate();
    };



    const proceedWithUpdate = (updatedOrder = editedOrder) => {
        const totalPayments = order.payments
            ? order.payments.reduce((sum, payment) => sum + payment.amount_paid, 0)
            : 0;

        const originalAmount = parseFloat(order.amount);
        const newAmount = parseFloat(updatedOrder.amount);

        // Check if the amount has decreased
        const amountDecreased = newAmount < originalAmount;

        // Update payment status based on whether amount decreased
        if (amountDecreased && totalPayments > newAmount) {
            updatedOrder.payment_status = 'Paid';
        } else if (totalPayments >= newAmount) {
            updatedOrder.payment_status = 'Paid';
        } else if (totalPayments > 0) {
            updatedOrder.payment_status = 'Partial';
        } else {
            updatedOrder.payment_status = 'Pending';
        }

        // Prepare data to send
        const dataToSend = {
            amount: updatedOrder.amount,
            payment_status: updatedOrder.payment_status,
            size: updatedOrder.size,
            purchase_date: order.purchase_date,
            shipping_status: updatedOrder.shipping_status,
            client_id: order.client_id,
            product_id: order.product_id,
        };

        apiService
            .updatePurchase(order.id, dataToSend)
            .then(() => {
                setSuccessMessage('Order updated successfully.');
                setIsEditing(false);
                refreshData();
            })
            .catch((error) => {
                console.error('Error updating order:', error);
            });
    };

    const handleGetPayPalLink = async () => {
        setIsLoadingLink(true);
        setErrorMessage('');
        setSuccessMessage('');

        try {
            // Regenerate or generate a new PayPal link
            const response = await apiService.regeneratePayPalLink(order.id);
            const { paypal_link } = response.data;

            // Update state and copy the link to clipboard
            setPayPalLink(paypal_link);
            navigator.clipboard.writeText(paypal_link);
            setSuccessMessage('PayPal link created and copied to clipboard!');
            setTimeout(() => setSuccessMessage(''), 3000); // Clear success message after 3 seconds
        } catch (err) {
            console.error('Error regenerating PayPal link:', err);
            setErrorMessage('Failed to regenerate PayPal link. Please try again.');
            setTimeout(() => setErrorMessage(''), 4000); // Clear error message after 3 seconds
        } finally {
            setIsLoadingLink(false);
        }
    };



    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedOrder(order);
    };

    const handleSuccess = (message) => {
        setSuccessMessage(message); // Set the success message
        setShowAddPaymentModal(false); // Close the modal
        refreshData(); // Refresh data to reflect the changes
    };


    const confirmDelete = () => {
        setDeletePurchaseId(order.id);
        setIsConfirmModalOpen(true);
    };

    const handleDeleteOrderClick = async () => {
        try {
            await apiService.deletePurchase(deletePurchaseId);

            // Remove the deleted order from the list using the parent function
            removeOrder(deletePurchaseId);

            setSuccessMessage('Order deleted successfully!');
        } catch (error) {
            console.error('Error deleting order:', error);
        } finally {
            setIsConfirmModalOpen(false);
            setDeletePurchaseId(null);
        }
    };

    const handleToggleShippingStatusClick = () => {
        const newStatus =
            order.shipping_status === 'Pending' ? 'Delivered' : 'Pending';
        apiService
            .updatePurchaseShipping(order.id, newStatus)
            .then(() => {
                setSuccessMessage(`Shipping status updated to ${newStatus}.`);
                refreshData();
            })
            .catch((error) => {
                console.error('Error updating shipping status:', error);
            });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "Pending":
                return "text-yellow-600"; // Yellow for Pending
            case "Overdue":
                return "text-red-600"; // Red for Overdue
            case "Paid":
                return "text-green-600"; // Green for Paid
            case "Partial":
                return "text-blue-600"; // Blue for Partial
            default:
                return "text-gray-600"; // Default/Unknown
        }
    };


    const formatDateSafely = (dateString) => {
        if (!dateString) return 'Unknown Date';

        const date = new Date(dateString);
        const correctedDate = new Date(
            date.getTime() + date.getTimezoneOffset() * 60000
        );

        return isNaN(correctedDate)
            ? 'Unknown Date'
            : correctedDate.toLocaleDateString();
    };
    const handleEditPayment = (payment) => {
        setEditingPayment(payment);
        setShowEditPaymentModal(true);
    };

    const handleSaveEditPayment = async (updatedPayment) => {
        try {
            const amountPaid = parseFloat(updatedPayment.amount_paid); // Convert to a float
            if (isNaN(amountPaid) || amountPaid <= 0) {
                setSuccessMessage("Payment amount must be a valid number greater than 0.");
                return;
            }

            if (updatedPayment.amount_paid > order.amount * 1.5) {
                setSuccessMessage("Payment amount is unusually high. Please confirm.");
                return;
            }

            await apiService.updatePayment(updatedPayment.id, updatedPayment);
            setSuccessMessage("Payment updated successfully.");
            refreshData();
        } catch (error) {
            console.error("Error updating payment:", error);
        } finally {
            setShowEditPaymentModal(false);
        }
    };

    const confirmDeletePayment = (paymentId) => {
        setDeletePaymentId(paymentId);
        setIsConfirmPaymentOpen(true);
    };

    const handleDeletePayment = async () => {
        try {
            await apiService.deletePayment(deletePaymentId);
            setSuccessMessage("Payment deleted successfully.");
            refreshData(); // Reload data to reflect changes
        } catch (error) {
            console.error("Error deleting payment:", error);
        } finally {
            setIsConfirmPaymentOpen(false);
        }
    };


    return (
        <div className="border border-gray-300 rounded mb-4">
            {/* Order Header */}
            <div className="flex justify-between items-center p-4 bg-gray-100">
                <div className="flex items-center">
                    {/* Product Image Thumbnail */}
                    {order.product_screenshot_photo && (
                        <img
                            src={order.product_screenshot_photo}
                            alt={order.product_name}
                            className="w-16 h-16 object-cover rounded mr-4 cursor-pointer"
                            onClick={handleImageClick}
                        />
                    )}
                    <div>
                        {isEditing ? (
                            <>
                                <input
                                    type="text"
                                    value={order.product_name}
                                    className="text-lg font-bold border-b"
                                    disabled
                                />
                                <p className="text-base font-bold text-gray-600">
                                    {formatDateSafely(order.purchase_date)}
                                </p>
                                <input
                                    type="number"
                                    value={editedOrder.amount}
                                    onChange={(e) =>
                                        setEditedOrder({
                                            ...editedOrder,
                                            amount: e.target.value,
                                        })
                                    }
                                    className="text-base border-b bg-yellow-100"
                                />
                                <select
                                    value={editedOrder.payment_status}
                                    onChange={(e) =>
                                        setEditedOrder({
                                            ...editedOrder,
                                            payment_status: e.target.value,
                                        })
                                    }
                                    className="text-base border-b bg-yellow-100"
                                >
                                    <option value="Paid">Paid</option>
                                    <option value="Partial">Partial</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Overdue">Overdue</option>
                                </select>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-bold">
                                    {order.product_name}
                                </h3>
                                <p className="text-base text-gray-600">
                                    {formatDateSafely(order.purchase_date)}
                                </p>
                                <p className="text-base">
                                    <strong>Amount:</strong> ${order.amount}
                                </p>
                                <p className="text-base">
                                    <strong>Payment Status:</strong>{' '}
                                    <span
                                        className={`
                                            ${getStatusColor(order.payment_status)}`
                                        }
                                    >
                                        {order.payment_status}
                                    </span>
                                </p>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    {order.payment_status !== 'Paid' && !isEditing && (
                        <button
                            onClick={handleAddPaymentClick}
                            className="flex items-center bg-green-500 hover:bg-green-600 text-white py-1 px-3 rounded"
                        >
                            <FaPlus className="mr-1" /> Add Payment
                        </button>
                    )}
                    {/* Get PayPal Link Button */}
                    {order.payment_status !== 'Paid' && (
                        <button
                            onClick={handleGetPayPalLink}
                            className={`flex items-center ${isLoadingLink ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                                } text-white py-1 px-3 rounded`}
                            disabled={isLoadingLink}
                        >
                            {isLoadingLink ? 'Loading...' : <FaLink className="mr-1" />} PayPal Link
                        </button>
                    )}
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSaveEdit}
                                className="text-gray-600 hover:text-gray-800"
                                title="Save"
                            >
                                <FaSave />
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="text-gray-600 hover:text-gray-800"
                                title="Cancel"
                            >
                                <FaTimes />
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Edit Order Button */}
                            <button
                                onClick={handleEditOrderClick}
                                className="text-gray-600 hover:text-gray-800"
                                title="Edit Order"
                            >
                                <FaEdit />
                            </button>
                            {/* Delete Order Button */}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDelete(order.id);
                                }}
                                className="text-gray-600 hover:text-gray-800"
                                title="Delete Order"
                            >
                                <FaTrash />
                            </button>
                            <button
                                onClick={toggleExpand}
                                className="text-gray-600 hover:text-gray-800"
                            >
                                {isExpanded ? (
                                    <FaAngleUp size={24} />
                                ) : (
                                    <FaAngleDown size={24} />
                                )}
                            </button>
                        </>
                    )}
                </div>

            </div>


            {/* Success Message */}
            {successMessage && (
                <div className="p-2 bg-green-100 text-green-800 rounded mx-4 mt-2">
                    {successMessage}
                </div>
            )}

            {/* Expanded Order Details */}
            {isExpanded && (
                <div className="p-4">
                    {isEditing ? (
                        <>
                            <p>
                                <strong>Size:</strong>{' '}
                                <input
                                    type="text"
                                    value={editedOrder.size}
                                    onChange={(e) =>
                                        setEditedOrder({
                                            ...editedOrder,
                                            size: e.target.value,
                                        })
                                    }
                                    className="border-b bg-yellow-100"
                                />
                            </p>
                            <p className="flex items-center">
                                <strong>Shipping Status:</strong>{' '}
                                <select
                                    value={editedOrder.shipping_status}
                                    onChange={(e) =>
                                        setEditedOrder({
                                            ...editedOrder,
                                            shipping_status: e.target.value,
                                        })
                                    }
                                    className="ml-2 border border-gray-300 rounded p-1 bg-yellow-100"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Delivered">Delivered</option>
                                </select>
                            </p>
                        </>
                    ) : (
                        <>
                            <p>
                                <strong>Size:</strong> {order.size}
                            </p>
                            <p className="flex items-center">
                                <strong>Shipping Status:</strong>{' '}
                                <span> {order.shipping_status}</span>
                            </p>
                            {/* Update Shipping Status Button */}
                            <button
                                onClick={handleToggleShippingStatusClick}
                                className="mt-2 text-sm text-blue-500 hover:underline"
                            >
                                {order.shipping_status === 'Pending'
                                    ? 'Mark as Delivered'
                                    : 'Mark as Pending'}
                            </button>
                            {/* Payments Associated with Order */}
                            <h4 className="mt-4 mb-2 font-bold">Payments:</h4>
                            <div className="space-y-4">
                                {Array.isArray(order.payments) && order.payments.length > 0 ? (
                                    <>
                                        {order.payments.map((payment) => (
                                            <div
                                                key={payment.id}
                                                className="flex justify-between items-center bg-gray-50 p-4 rounded-lg shadow-sm border"
                                            >
                                                <div>
                                                    <p>
                                                        <strong>Amount:</strong> ${payment.amount_paid}
                                                    </p>
                                                    <p>
                                                        <strong>Method:</strong> {payment.payment_method}
                                                    </p>
                                                    <p>
                                                        <strong>Date:</strong>{' '}
                                                        {formatDateSafely(payment.payment_date)}
                                                    </p>
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    {/* Edit Payment Button */}
                                                    <button
                                                        onClick={() => handleEditPayment(payment)}
                                                        className="bg-blue-500 hover:bg-blue-700 text-white py-1 px-3 rounded"
                                                    >
                                                        Edit
                                                    </button>
                                                    {/* Delete Payment Button */}
                                                    <button
                                                        onClick={() => confirmDeletePayment(payment.id)}
                                                        className="bg-red-500 hover:bg-red-700 text-white py-1 px-3 rounded"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        {/* Display Remaining Balance for Partial Payments */}
                                        {order.payment_status === 'Partial' && (
                                            <div className="bg-yellow-100 text-yellow-800 p-4 mt-4 rounded-lg">
                                                <p>
                                                    <strong>Amount Owed:</strong> $
                                                    {(
                                                        order.amount -
                                                        order.payments.reduce(
                                                            (sum, payment) => sum + payment.amount_paid,
                                                            0
                                                        )
                                                    ).toFixed(2)}
                                                </p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <p className="text-gray-600">
                                        {order.payment_status === 'Pending'
                                            ? 'No payments for this order.'
                                            : 'No payment records available.'}
                                    </p>
                                )}
                            </div>


                        </>
                    )}
                </div>
            )}


            {/* Image Modal */}
            {showImageModal && (
                <div className="fixed inset-0 flex items-center justify-center z-50">
                    {/* Modal Overlay */}
                    <div
                        className="absolute inset-0 bg-black opacity-75"
                        onClick={() => setShowImageModal(false)}
                    ></div>
                    {/* Modal Content */}
                    <div className="bg-white p-4 rounded shadow-lg z-50 relative max-w-screen-md max-h-screen overflow-auto">
                        {/* Close Icon */}
                        <button
                            onClick={() => setShowImageModal(false)}
                            className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
                        >
                            <FaTimes size={24} />
                        </button>
                        {/* Image */}
                        <img
                            src={order.product_screenshot_photo}
                            alt={order.product_name}
                            className="max-w-full max-h-screen rounded-lg h-auto"
                        />
                    </div>
                </div>
            )}

            {/* Amount Increase Confirmation Modal */}
            {isAmountIncreaseConfirmOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-lg font-bold mb-4">Confirm Amount Increase</h2>
                        <p>
                            You have increased the order amount while payments already exist.
                            This will change the payment status to 'Partial'. Do you want to proceed?
                        </p>
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={() => {
                                    setIsAmountIncreaseConfirmOpen(false);
                                }}
                                className="mr-4 bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setIsAmountIncreaseConfirmOpen(false);
                                    proceedWithUpdate();
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Amount Decrease Confirmation Modal */}
            {isAmountDecreaseConfirmOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-lg font-bold mb-4">Confirm Amount Decrease</h2>
                        <p>
                            You have decreased the order amount while payments already exist.
                            This may affect the payment status. Do you want to proceed?
                        </p>
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={() => {
                                    setIsAmountDecreaseConfirmOpen(false);
                                }}
                                className="mr-4 bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setIsAmountDecreaseConfirmOpen(false);
                                    proceedWithUpdate();
                                }}
                                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded"
                            >
                                Proceed
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Confirmation Modal */}
            {isConfirmModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-lg font-bold mb-4">Confirm Deletion</h2>
                        <p>Are you sure you want to delete this order?</p>
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={() => {
                                    setIsConfirmModalOpen(false);
                                    setDeletePurchaseId(null);
                                }}
                                className="mr-4 bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteOrderClick}
                                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Add Payment Modal */}
            {showAddPaymentModal && (
                <AddPaymentModal
                    purchaseId={selectedPurchaseId} // Reference
                    totalAmountDue={order.amount}
                    remainingBalance={remainingBalance} // Pass calculated remaining balance
                    clientId={clientId}
                    onClose={() => {
                        setShowAddPaymentModal(false);
                        refreshData();
                        if (pendingStatusChange) {
                            setEditedOrder(order); // Reset editedOrder to original order
                            setPendingStatusChange(null);
                            setSuccessMessage('Payment was not added. Status change canceled.');
                        }
                    }}
                    onSuccess={handleSuccess}
                />
            )}

            {/* Edit Payment Modal */}
            {showEditPaymentModal && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-800 bg-opacity-75 z-50">
                    {/* Modal Content */}
                    <div className="bg-white p-6 rounded shadow-lg max-w-md w-full relative">
                        <h2 className="text-xl font-bold mb-4">Edit Payment</h2>

                        {/* Payment Amount */}
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">Payment Amount:</label>
                            <input
                                type="number"
                                value={editingPayment.amount_paid}
                                onChange={(e) => {
                                    const amount = parseFloat(e.target.value);
                                    setEditingPayment({
                                        ...editingPayment,
                                        amount_paid: amount,
                                    });
                                }}
                                className={`w-full border p-2 rounded ${editingPayment.amount_paid < 0 ||
                                    editingPayment.amount_paid > order.amount * 1.5
                                    ? 'border-red-500'
                                    : 'border-gray-300'
                                    }`}
                            />
                            {/* Validation Message */}
                            {editingPayment.amount_paid < 0 && (
                                <p className="text-red-600 text-sm mt-2">Amount must be greater than 0.</p>
                            )}
                            {editingPayment.amount_paid > order.amount * 1.5 && (
                                <p className="text-red-600 text-sm mt-2">
                                    Amount is unusually high. Please confirm.
                                </p>
                            )}
                            {order.payment_status === 'Paid' &&
                                editingPayment.amount_paid < order.amount && (
                                    <p className="text-red-600 text-sm mt-2">
                                        Cannot reduce payment amount below the total purchase amount for a paid
                                        order.
                                    </p>
                                )}
                        </div>

                        {/* Payment Method */}
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">Payment Method:</label>
                            <div className="flex flex-wrap gap-2">
                                {['Credit Card', 'PayPal', 'Venmo', 'Zelle', 'Bank Transfer', 'Other'].map(
                                    (method) => (
                                        <label
                                            key={method}
                                            className="flex items-center space-x-2 cursor-pointer"
                                        >
                                            <input
                                                type="radio"
                                                value={method}
                                                checked={editingPayment.payment_method === method}
                                                onChange={() =>
                                                    setEditingPayment({
                                                        ...editingPayment,
                                                        payment_method: method,
                                                    })
                                                }
                                                className="form-radio"
                                            />
                                            <span>{method}</span>
                                        </label>
                                    )
                                )}
                            </div>
                        </div>

                        {/* Payment Date */}
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2">Payment Date:</label>
                            <input
                                type="date"
                                value={editingPayment.payment_date}
                                onChange={(e) =>
                                    setEditingPayment({
                                        ...editingPayment,
                                        payment_date: e.target.value,
                                    })
                                }
                                className="w-full border p-2 rounded border-gray-300"
                            />
                        </div>

                        {/* Quick Pay Full Balance Option */}
                        {order.payment_status === 'Partial' && (
                            <div className="mb-4 bg-yellow-100 p-3 rounded">
                                <p className="text-yellow-800 font-medium">
                                    Remaining Balance: $
                                    {(
                                        order.amount -
                                        (order.payments || []).reduce(
                                            (sum, payment) => sum + payment.amount_paid,
                                            0
                                        )
                                    ).toFixed(2)}
                                </p>
                                <button
                                    onClick={() =>
                                        setEditingPayment({
                                            ...editingPayment,
                                            amount_paid: order.amount,
                                        })
                                    }
                                    className="mt-2 bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded"
                                >
                                    Pay Full Balance
                                </button>
                            </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-4">
                            <button
                                onClick={() => setShowEditPaymentModal(false)}
                                className="bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleSaveEditPayment(editingPayment)}
                                disabled={
                                    editingPayment.amount_paid < 0 ||
                                    editingPayment.amount_paid > order.amount * 1.5 ||
                                    (order.payment_status === 'Paid' &&
                                        editingPayment.amount_paid < order.amount)
                                }
                                className={`py-2 px-4 rounded ${editingPayment.amount_paid < 0 ||
                                    editingPayment.amount_paid > order.amount * 1.5 ||
                                    (order.payment_status === 'Paid' &&
                                        editingPayment.amount_paid < order.amount)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                    }`}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {/* Delete Payment Confirmation Modal */}
            {isConfirmPaymentOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-lg font-bold mb-4">Confirm Deletion</h2>
                        <p>Are you sure you want to delete this payment?</p>
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={() => setIsConfirmPaymentOpen(false)}
                                className="mr-4 bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeletePayment}
                                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderCard;
