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
} from 'react-icons/fa';
import PaymentItem from './PaymentItem';
import apiService from '../services/apiService';
import AddPaymentModal from './AddPaymentModal';

const OrderCard = ({ order, clientId, refreshData }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedOrder, setEditedOrder] = useState(order);
    const [successMessage, setSuccessMessage] = useState('');

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

        // Prevent changing to 'Pending' if payments exist
        if (
            newPaymentStatus === 'Pending' &&
            originalPaymentStatus === 'Paid' &&
            order.payments &&
            order.payments.length > 0
        ) {
            setSuccessMessage(
                'Cannot change payment status to "Pending" while payments exist.'
            );
            return;
        }

        apiService
            .updateOrder(order.id, editedOrder)
            .then(() => {
                setSuccessMessage('Order updated successfully.');
                setIsEditing(false);
                refreshData();

                // Open Add Payment Modal if status changed to 'Paid' without payments
                if (
                    newPaymentStatus === 'Paid' &&
                    (!order.payments || order.payments.length === 0)
                ) {
                    setShowAddPaymentModal(true);
                }
            })
            .catch((error) => {
                console.error('Error updating order:', error);
            });
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedOrder(order);
    };

    const handleDeleteOrderClick = () => {
        // Replace window.confirm with a custom confirmation if desired
        if (window.confirm('Are you sure you want to delete this order?')) {
            apiService
                .deleteOrder(order.id)
                .then(() => {
                    setSuccessMessage('Order deleted successfully.');
                    refreshData();
                })
                .catch((error) => {
                    console.error('Error deleting order:', error);
                });
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
                                    value={editedOrder.product_name}
                                    onChange={(e) =>
                                        setEditedOrder({
                                            ...editedOrder,
                                            product_name: e.target.value,
                                        })
                                    }
                                    className="text-lg font-bold border-b"
                                />
                                <p className="text-sm text-gray-600">
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
                                    className="text-sm border-b"
                                />
                                <select
                                    value={editedOrder.payment_status}
                                    onChange={(e) =>
                                        setEditedOrder({
                                            ...editedOrder,
                                            payment_status: e.target.value,
                                        })
                                    }
                                    className="text-sm border-b"
                                >
                                    <option value="Paid">Paid</option>
                                    <option value="Pending">Pending</option>
                                </select>
                            </>
                        ) : (
                            <>
                                <h3 className="text-lg font-bold">
                                    {order.product_name}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {formatDateSafely(order.purchase_date)}
                                </p>
                                <p className="text-sm">
                                    <strong>Amount:</strong> ${order.amount}
                                </p>
                                <p className="text-sm">
                                    <strong>Payment Status:</strong>{' '}
                                    <span
                                        className={
                                            order.payment_status === 'Paid'
                                                ? 'text-green-600'
                                                : 'text-red-600'
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
                                onClick={handleDeleteOrderClick}
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
                                    className="border-b"
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
                                    className="ml-2 border border-gray-300 rounded p-1"
                                >
                                    <option value="Pending">Pending</option>
                                    <option value="Delivered">
                                        Delivered
                                    </option>
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
                            <h4 className="mt-4 mb-2 font-semibold">
                                Payments:
                            </h4>
                            {Array.isArray(order.payments) &&
                            order.payments.length > 0 ? (
                                order.payments.map((payment) => (
                                    <PaymentItem
                                        key={payment.id}
                                        payment={payment}
                                    />
                                ))
                            ) : (
                                <p className="text-gray-600">
                                    {order.payment_status === 'Pending'
                                        ? 'No payments for this order.'
                                        : 'No payment records available.'}
                                </p>
                            )}
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
                            className="w-full h-auto"
                        />
                    </div>
                </div>
            )}

            {/* Add Payment Modal */}
            {showAddPaymentModal && (
                <AddPaymentModal
                    order={order}
                    clientId={clientId}
                    onClose={() => {
                        setShowAddPaymentModal(false);
                        refreshData();
                    }}
                />
            )}
        </div>
    );
};

export default OrderCard;
