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
    FaLink,
    FaCheck,
    FaMagic,
    FaCopy,
    FaShoppingBag,
} from 'react-icons/fa';
import apiService from '../services/apiService';
import AddPaymentModal from './AddPaymentModal';
import AddItemToOrderModal from './AddItemToOrderModal';

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
    const [hasCredentials, setHasCredentials] = useState(false); // Track PayPal credentials
    const [systemInfo, setSystemInfo] = useState(null); // Track full system info
    const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);

    const [editingItemId, setEditingItemId] = useState(null);
    const [editingItemData, setEditingItemData] = useState({
        size: '',
        quantity: 1,
        price_per_item: 0
    });
    const [itemToDeleteId, setItemToDeleteId] = useState(null);
    const [isConfirmItemDeleteOpen, setIsConfirmItemDeleteOpen] = useState(false);
    const [isConfirmUpdateTotalOpen, setIsConfirmUpdateTotalOpen] = useState(false);
    const [newCalculatedAmount, setNewCalculatedAmount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 3;

    // Calculate pagination
    const totalPages = Math.ceil(order.items.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = order.items.slice(startIndex, startIndex + itemsPerPage);
    const [selectedImage, setSelectedImage] = useState(null);










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

    const handleAddPaymentClick = () => {
        setShowAddPaymentModal(true);
    };

    const handleImageClick = (item) => {
        setSelectedImage(item);
        setShowImageModal(true);
    };


    const handleOpenAddItemModal = () => {
        setIsAddItemModalOpen(true);
    };

    const handleCloseAddItemModal = () => {
        setIsAddItemModalOpen(false);
    };
    const handleItemAdded = () => {
        // Re-fetch or refresh data so we see the newly added item
        refreshData();
    };

    const handleEditOrderClick = () => {
        setIsEditing(true);

        // Copy purchase-level data into local state
        setEditedOrder({
            ...order, // Or pick the fields you specifically want to allow editing
            amount: order.amount,
            payment_status: order.payment_status,
            // etc.
        });

        // If there's exactly 1 item, also copy item-level data
        if (order.items && order.items.length === 1) {
            const singleItem = order.items[0];
            setEditingItemId(singleItem.id);
            setEditingItemData({
                size: singleItem.size || '',
                quantity: singleItem.quantity || 1,
                price_per_item: singleItem.price_per_item || 0,
            });
        }
    };

    const handleSaveEdit = async () => {
        const originalPaymentStatus = order.payment_status;
        const newPaymentStatus = editedOrder.payment_status;
        const originalAmount = parseFloat(order.amount);
        const newAmount = parseFloat(editedOrder.amount);

        try {
            // Handle single-item update
            if (order.items && order.items.length === 1) {
                // If an item ID is set, update that item with the *latest user input* in editingItemData
                if (editingItemId) {
                    await apiService.updatePurchaseItem(editingItemId, {
                        size: editingItemData.size,
                        quantity: editingItemData.quantity,
                        price_per_item: editingItemData.price_per_item,
                    });
                }
            }
            if (
                (originalPaymentStatus === 'Pending' && newPaymentStatus === 'Overdue') ||
                (originalPaymentStatus === 'Overdue' && newPaymentStatus === 'Pending')
            ) {
                proceedWithUpdate({ ...editedOrder });
                return;
            }
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
            if (newAmount < originalAmount && order.payments && order.payments.length > 0) {
                setIsAmountDecreaseConfirmOpen(true);
                return;
            }
            // Proceed with update if all checks pass
            proceedWithUpdate();
        } catch (error) {
            console.error('Error saving edits:', error);
            setErrorMessage('An error occurred while saving your changes. Please try again.');
        }
    };


    const proceedWithUpdate = (updatedOrder = editedOrder) => {
        const totalPayments = order.payments
            ? order.payments.reduce((sum, payment) => sum + payment.amount_paid, 0)
            : 0;

        const originalAmount = parseFloat(order.amount);
        const newAmount = parseFloat(updatedOrder.amount);
        const currentPaymentStatus = updatedOrder.payment_status;

        // Check if the amount has decreased
        const amountDecreased = newAmount < originalAmount;

        // Update payment status based on whether amount decreased
        if (currentPaymentStatus !== 'Overdue' && currentPaymentStatus !== 'Pending') {
            if (amountDecreased && totalPayments > newAmount) {
                updatedOrder.payment_status = 'Paid';
            } else if (totalPayments >= newAmount) {
                updatedOrder.payment_status = 'Paid';
            } else if (totalPayments > 0) {
                updatedOrder.payment_status = 'Partial';
            } else {
                updatedOrder.payment_status = 'Pending';
            }
        }

        // Prepare data to send
        const dataToSend = {
            amount: updatedOrder.amount,
            payment_status: updatedOrder.payment_status, // Use the preserved or updated status
            purchase_date: order.purchase_date,
            shipping_status: updatedOrder.shipping_status,
            client_id: order.client_id,
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

    const calculateNewOrderAmount = (items) => {
        return items.reduce(
            (sum, it) =>
                sum + parseFloat(it.price_per_item) * parseFloat(it.quantity),
            0
        );
    };

    const handleEditItemClick = (item) => {
        setEditingItemId(item.id);
        setEditingItemData({
            size: item.size || '',
            quantity: item.quantity || 1,
            price_per_item: item.price_per_item || 0
        });
    };

    const handleCancelEditItem = () => {
        setEditingItemId(null);
        setEditingItemData({ size: '', quantity: 1, price_per_item: 0 });
    };

    const handleSaveItem = async (itemId) => {
        if (editingItemData.quantity <= 0) {
            setSuccessMessage('Quantity must be at least 1.');
            return;
        }
        if (editingItemData.price_per_item < 0) {
            setSuccessMessage('Price per item cannot be negative.');
            return;
        }

        // Find the old item data for comparison
        const oldItem = order.items.find((it) => it.id === itemId);
        if (!oldItem) {
            setSuccessMessage('Cannot find the item to update.');
            return;
        }

        const oldPrice = parseFloat(oldItem.price_per_item);
        const newPrice = parseFloat(editingItemData.price_per_item);

        try {
            // 1) Update the item on the server
            await apiService.updatePurchaseItem(itemId, {
                size: editingItemData.size,
                quantity: editingItemData.quantity,
                price_per_item: editingItemData.price_per_item,
            });

            // 2) Update local items array
            const updatedItems = order.items.map((it) =>
                it.id === itemId
                    ? {
                        ...it,
                        size: editingItemData.size,
                        quantity: editingItemData.quantity,
                        price_per_item: editingItemData.price_per_item,
                    }
                    : it
            );

            // 3) Recalculate new total
            const newAmount = calculateNewOrderAmount(updatedItems);

            // If the price_per_item *did* change, show the modal
            if (oldPrice !== newPrice) {
                setNewCalculatedAmount(newAmount);
                setIsConfirmUpdateTotalOpen(true);
                // Optionally still refresh data for other parts of the UI
                refreshData();
            } else {
                // If the price did NOT change, update the total immediately (no modal)
                await apiService.updatePurchase(order.id, {
                    amount: newAmount,
                    client_id: order.client_id,
                    purchase_date: order.purchase_date,
                    shipping_status: order.shipping_status,
                    payment_status: order.payment_status,
                });

                setSuccessMessage(`Successfully Updated Item!`);

                // Clean up edit state
                setEditingItemId(null);
                setEditingItemData({ size: '', quantity: 1, price_per_item: 0 });

                // Optional: also refresh to keep everything in sync
                refreshData();
            }
        } catch (error) {
            console.error('Error updating item:', error);
            setSuccessMessage('Failed to update item. Please try again.');
        }
    };



    const handleConfirmUpdateTotal = async () => {
        try {
            await apiService.updatePurchase(order.id, {
                amount: newCalculatedAmount,
                client_id: order.client_id,
                purchase_date: order.purchase_date,
                shipping_status: order.shipping_status,
                payment_status: order.payment_status,
            });
            setSuccessMessage(`Item updated. Order total changed to $${newCalculatedAmount}.`);
        } catch (error) {
            console.error('Error updating order amount:', error);
            setSuccessMessage('Failed to update order total. Please try again.');
        } finally {
            // Cleanup
            setIsConfirmUpdateTotalOpen(false);
            setEditingItemId(null);
            setEditingItemData({ size: '', quantity: 1, price_per_item: 0 });
        }
    };

    const handleCancelUpdateTotal = () => {
        setSuccessMessage('Item updated. Order total left unchanged.');
        setIsConfirmUpdateTotalOpen(false);

        // Also close any edit states
        setEditingItemId(null);
        setEditingItemData({ size: '', quantity: 1, price_per_item: 0 });
    };


    const handleDeleteItemClick = (itemId) => {
        setItemToDeleteId(itemId);
        setIsConfirmItemDeleteOpen(true);
    };

    const confirmDeleteItem = async () => {
        try {
            // 1) Delete the item on the server
            await apiService.deletePurchaseItem(itemToDeleteId);

            // 2) Remove the item from local items array so we can recalc the total
            const updatedItems = order.items.filter(
                (it) => it.id !== itemToDeleteId
            );

            // 3) Calculate the new total
            const newAmount = calculateNewOrderAmount(updatedItems);

            // 4) Update the purchase with the new total
            await apiService.updatePurchase(order.id, {
                amount: newAmount,
                client_id: order.client_id,
                purchase_date: order.purchase_date,
                shipping_status: order.shipping_status,
                payment_status: order.payment_status,
            });

            setSuccessMessage('Item deleted and order total updated.');

            // 5) (Optional) Refresh to ensure the parent picks up changes
            refreshData();
        } catch (error) {
            console.error('Error deleting item:', error);
            setSuccessMessage('Failed to delete item. Please try again.');
        } finally {
            setIsConfirmItemDeleteOpen(false);
            setItemToDeleteId(null);
        }
    };


    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    const handleGetPayPalLink = () => {
        setIsLoadingLink(true); // Indicate loading state
        setErrorMessage('');
        setSuccessMessage('');
        setPayPalLink(null); // Clear any existing link

        apiService
            .regeneratePayPalLink(order.id)
            .then((response) => {
                const { paypal_link } = response.data;

                setPayPalLink(paypal_link); // Set the generated link
                setSuccessMessage('PayPal link generated successfully! Click "Copy Link" to copy it.');

                // Clear the PayPal link after 30 seconds
                setTimeout(() => {
                    setPayPalLink(null);
                }, 30000); // 30 seconds

                setTimeout(() => setSuccessMessage(''), 5000); // Clear success message after 4 seconds
            })
            .catch((err) => {
                console.error(`Error generating PayPal link for order ${order.id}:`, err);
                setErrorMessage('Failed to generate PayPal link. Please try again.');
                setTimeout(() => setErrorMessage(''), 4000); // Clear error message after 4 seconds
            })
            .finally(() => {
                setIsLoadingLink(false); // Reset loading state
            });
    };


    const handleCopyToClipboard = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(paypalLink);
                setSuccessMessage('PayPal link copied to clipboard!');
                setTimeout(() => setSuccessMessage(''), 3000); // Clear success message after 3 seconds
            } else {
                throw new Error('Clipboard API not supported.');
            }
        } catch (err) {
            console.error('Error copying PayPal link:', err);
            setErrorMessage('Failed to copy PayPal link. Please try again.');
            setTimeout(() => setErrorMessage(''), 4000); // Clear error message after 3 seconds
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
            {/* HEADER */}
            <div className="flex justify-between items-center p-4 bg-gray-100">
                {Array.isArray(order.items) && order.items.length === 1 && (
                    <div className="flex items-center">
                        <img
                            src={order.items[0].screenshot_photo}
                            alt={order.items[0].product_name}
                            className="w-20 h-20 object-cover rounded mr-4 cursor-pointer"
                            onClick={() => handleImageClick(order.items[0])}
                            />
                        <div>
                            {isEditing ? (
                                <>
                                    {/* Purchase-level + single-item edit mode */}
                                    <input
                                        type="text"
                                        value={order.items[0].product_name}
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
                                            setEditedOrder({ ...editedOrder, amount: e.target.value })
                                        }
                                        className="text-base border-b bg-yellow-100"
                                    />
                                    <select
                                        value={editedOrder.payment_status}
                                        onChange={(e) =>
                                            setEditedOrder({ ...editedOrder, payment_status: e.target.value })
                                        }
                                        className="text-base border-b bg-yellow-100"
                                    >
                                        <option value="Paid">Paid</option>
                                        <option value="Partial">Partial</option>
                                        <option value="Pending">Pending</option>
                                        <option value="Overdue">Overdue</option>
                                    </select>
                                    <div className="p-4">
                                        {/* SINGLE-ITEM: If isEditing, show size input */}
                                        {order.items && order.items.length === 1 && (
                                            <div className="flex items-center space-x-4">
                                                <label>
                                                    <span className='mr-2 text-base font-bold'>Size:</span>
                                                    <input
                                                        type="text"
                                                        value={editingItemData.size}
                                                        onChange={(e) =>
                                                            setEditingItemData({ ...editingItemData, size: e.target.value })
                                                        }
                                                        className="text-base border-b bg-yellow-100"
                                                    />
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* View mode for single-item header */}
                                    <h3 className="text-lg font-bold">Order #{order.id} - {order.items[0].product_name}</h3>
                                    <p className="text-base text-gray-600">
                                        {formatDateSafely(order.purchase_date)}
                                    </p>
                                    <p className="text-base">
                                        <strong>Order Amount To Sell:</strong> ${order.amount}
                                    </p>
                                    <p className="text-base">
                                        <strong>Payment Status:</strong>{' '}
                                        <span className={getStatusColor(order.payment_status)}>
                                            {order.payment_status}
                                        </span>
                                    </p>
                                    <p className='text-base'>
                                        <strong>Size:</strong> {order.items[0].size}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )}
                {/* MULTIPLE-ITEM HEADER */}
                {Array.isArray(order.items) && order.items.length > 1 && (
                    <div className="flex items-center space-x-4 py-2">
                        <div>
                            {isEditing ? (
                                <>
                                    <div className="flex items-center space-x-2">
                                        <FaShoppingBag className="text-2xl text-gray-600" /> {/* Shopping Bag Icon */}
                                        <h3 className="text-lg font-bold">Order #{order.id} has {order.items.length} Items</h3>
                                    </div>
                                    <p className="text-base font-bold text-gray-600">
                                        {formatDateSafely(order.purchase_date)}
                                    </p>
                                    <input
                                        type="number"
                                        value={editedOrder.amount}
                                        onChange={(e) =>
                                            setEditedOrder({ ...editedOrder, amount: e.target.value })
                                        }
                                        className="text-base border-b bg-yellow-100"
                                    />
                                    <select
                                        value={editedOrder.payment_status}
                                        onChange={(e) =>
                                            setEditedOrder({ ...editedOrder, payment_status: e.target.value })
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
                                    <div className="flex items-center space-x-2">
                                        <FaShoppingBag className="text-2xl text-gray-600" /> {/* Shopping Bag Icon */}
                                        <h3 className="text-lg font-bold">Order #{order.id} has {order.items.length} Items</h3>
                                    </div>
                                    <p className="text-base text-gray-600">
                                        {formatDateSafely(order.purchase_date)}
                                    </p>
                                    <p className="text-base">
                                        <strong>Order Amount To Sell:</strong> ${order.amount}
                                    </p>
                                    <p className="text-base">
                                        <strong>Payment Status:</strong>{' '}
                                        <span className={getStatusColor(order.payment_status)}>
                                            {order.payment_status}
                                        </span>
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* ACTION BUTTONS (Add Payment, PayPal Link, Edit Order, Delete Order, Expand) */}
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
                    {hasCredentials && order.payment_status !== 'Paid' && !isEditing && (
                        <div>
                            {isLoadingLink ? (
                                // Loading State
                                <button
                                    className="flex items-center bg-gray-400 text-white py-1 px-3 rounded cursor-not-allowed"
                                    disabled
                                >
                                    Generating...
                                </button>
                            ) : (
                                // Generate or Copy Link Button
                                !paypalLink ? (
                                    // Generate Button
                                    <button
                                        onClick={handleGetPayPalLink}
                                        className="flex items-center bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded"
                                    >
                                        <FaMagic className="mr-1" /> Generate PayPal Link
                                    </button>
                                ) : (
                                    // Copy Button with Checkmark
                                    <div className="flex items-center space-x-2">
                                        <FaCheck className="text-green-500 text-xl" aria-label="Link Generated" />
                                        <button
                                            onClick={handleCopyToClipboard}
                                            className="px-3 py-1 flex items-center bg-blue-600 hover:bg-blue-700 text-white rounded transition-all"
                                        >
                                            <FaCopy className="mr-1" />
                                            Copy Link
                                        </button>
                                    </div>
                                )
                            )}
                        </div>

                    )}
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSaveEdit}
                                className="text-gray-600 hover:text-gray-800"
                                title="Save"
                            >
                                <FaSave size={18} />
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="text-gray-600 hover:text-gray-800"
                                title="Cancel"
                            >
                                <FaTimes size={20} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleEditOrderClick}
                                className="text-gray-600 hover:text-gray-800"
                                title="Edit Order"
                            >
                                <FaEdit size={20} />
                            </button>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    confirmDelete(order.id); // Purchase-level delete
                                }}
                                className="text-gray-600 hover:text-gray-800"
                                title="Delete Order"
                            >
                                <FaTrash size={18} />
                            </button>
                            <button onClick={toggleExpand} className="text-gray-600 hover:text-gray-800">
                                {isExpanded ? <FaAngleUp size={25} /> : <FaAngleDown size={25} />}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* SUCCESS MESSAGE */}
            {successMessage && (
                <div className="p-2 bg-green-100 text-green-800 rounded mx-4 mt-2">
                    {successMessage}
                </div>
            )}

            {/* EXPANDED SECTION */}
            {isExpanded && (
                <div className="p-4">
                    {/* MULTIPLE-ITEMS: Each item is edited/deleted independently */}
                    {Array.isArray(order.items) && order.items.length > 1 && (
                        <>
                            <h4 className="font-bold mb-2">Order Items:</h4>
                            <div className="space-y-4 mb-4">
                                {paginatedItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="flex items-start space-x-4 bg-gray-50 p-4 rounded-lg border shadow-sm"
                                    >
                                        <img
                                            src={item.screenshot_photo}
                                            alt={item.product_name}
                                            className="w-16 h-16 object-cover rounded cursor-pointer"
                                            onClick={() => handleImageClick(item)}

                                        />
                                        {editingItemId === item.id ? (
                                            /* EDIT MODE for this item */
                                            <div className="flex-1">
                                                <p className="font-bold">{item.product_name}</p>
                                                <label className="block mt-2">
                                                    <strong>Size:</strong>{' '}
                                                    <input
                                                        type="text"
                                                        value={editingItemData.size}
                                                        onChange={(e) =>
                                                            setEditingItemData({
                                                                ...editingItemData,
                                                                size: e.target.value
                                                            })
                                                        }
                                                        className="border p-1 rounded w-full bg-yellow-100"
                                                    />
                                                </label>
                                                <label className="block mt-2">
                                                    <strong>Quantity:</strong>{' '}
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={editingItemData.quantity}
                                                        onChange={(e) =>
                                                            setEditingItemData({
                                                                ...editingItemData,
                                                                quantity: e.target.value
                                                            })
                                                        }
                                                        className="border p-1 rounded w-full bg-yellow-100"
                                                    />
                                                </label>
                                                <label className="block mt-2">
                                                    <strong>Price Per Item:</strong>{' '}
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={editingItemData.price_per_item}
                                                        onChange={(e) =>
                                                            setEditingItemData({
                                                                ...editingItemData,
                                                                price_per_item: e.target.value
                                                            })
                                                        }
                                                        className="border p-1 rounded w-full bg-yellow-100"
                                                    />
                                                </label>
                                                <div className="flex items-center space-x-2 mt-2">
                                                    <button
                                                        onClick={() => handleSaveItem(item.id)}
                                                        className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={handleCancelEditItem}
                                                        className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-1 px-3 rounded"
                                                    >
                                                        Cancel
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            /* VIEW MODE for this item */
                                            <div className="flex-1">
                                                <p className="font-bold">{item.product_name}</p>
                                                <p className="text-sm">
                                                    <strong>Size: </strong> {item.size}
                                                </p>
                                                <p className="text-sm">
                                                    <strong>Quantity: </strong> {item.quantity}
                                                </p>
                                                <p className="text-sm">
                                                    <strong>Price Per Item: </strong> ${item.price_per_item}
                                                </p>
                                                <div className="flex items-center space-x-2 mt-2">
                                                    <button
                                                        onClick={() => handleEditItemClick(item)}
                                                        className="bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteItemClick(item.id)}
                                                        className="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            {/* Pagination Controls */}
                            <div className="flex justify-between items-center">
                                <button
                                    onClick={handlePreviousPage}
                                    disabled={currentPage === 1}
                                    className={`py-1 px-3 rounded ${currentPage === 1 ? 'bg-gray-300 text-gray-500' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                                >
                                    Previous
                                </button>
                                <p>
                                    Page {currentPage} of {totalPages}
                                </p>
                                <button
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages}
                                    className={`py-1 px-3 rounded ${currentPage === totalPages ? 'bg-gray-300 text-gray-500' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
                                >
                                    Next
                                </button>
                            </div>
                        </>
                    )}
                    <div className='mt-4'>
                        <button
                            onClick={handleOpenAddItemModal}
                            className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 mb-4 rounded"
                        >
                            + Add Item
                        </button>

                        <p className="flex items-center">
                            <strong>Shipping Status:</strong>{' '}
                            <span className="ml-1">{order.shipping_status}</span>
                        </p>
                        <button
                            onClick={handleToggleShippingStatusClick}
                            className="mt-2 text-sm text-blue-500 hover:underline"
                        >
                            {order.shipping_status === 'Pending'
                                ? 'Mark as Delivered'
                                : 'Mark as Pending'}
                        </button>
                    </div>


                    {/* PAYMENTS SECTION */}
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
                                                <strong>Date:</strong> {formatDateSafely(payment.payment_date)}
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
                                            <strong>Amount Owed:</strong>{' '}
                                            {(
                                                order.amount -
                                                order.payments.reduce(
                                                    (sum, payment) => sum + parseFloat(payment.amount_paid || 0),
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
                </div>
            )}



            {showImageModal && selectedImage && (
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

                        {/* Single Image Display */}
                        <img
                            src={selectedImage.screenshot_photo}
                            alt={selectedImage.product_name || 'Selected Item'}
                            className="max-w-full max-h-screen rounded-lg h-auto"
                        />

                        {/* Optionally show item details */}
                        <p className="mt-2 text-center font-semibold">
                            {selectedImage.product_name}
                        </p>
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


            {/* AddItemToOrderModal */}
            <AddItemToOrderModal
                isOpen={isAddItemModalOpen}
                onClose={handleCloseAddItemModal}
                purchaseId={order.id}
                onItemAdded={handleItemAdded}
            />

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
            {/* Delete item Confirmation Modal */}
            {isConfirmItemDeleteOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-lg font-bold mb-4">Confirm Deletion</h2>
                        <p>Are you sure you want to delete this item for this order?</p>
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={() => setIsConfirmItemDeleteOpen(false)}
                                className="mr-4 bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDeleteItem}
                                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Updating Total Purchase Amount Confirmation Modal */}
            {isConfirmUpdateTotalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-gray-600 bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-lg font-bold mb-4">Confirm Update</h2>
                        <p> You updated the price or quantity of an item. Would you like to
                            update the order&apos;s total to <strong>${newCalculatedAmount}</strong>?</p>
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={handleCancelUpdateTotal}
                                className="mr-4 bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmUpdateTotal}
                                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded"
                            >
                                Update
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
