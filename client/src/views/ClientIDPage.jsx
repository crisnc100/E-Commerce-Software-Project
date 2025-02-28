import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '../services/apiService';
import AddPurchaseModal from './AddPurchaseModal';
import OrderCard from './OrderCard'; // We'll create this component
import {
    FaPlus,
    FaCreditCard,
    FaEdit,
    FaTrash,
    FaPhoneAlt,
    FaEnvelope,
    FaSave,
    FaTimes
} from 'react-icons/fa';

const ClientIDPage = () => {
    const { clientId } = useParams();
    const [clientInfo, setClientInfo] = useState(null);
    const [orders, setOrders] = useState([]);
    const [totalSales, setTotalSales] = useState(0);
    const [sortOption, setSortOption] = useState('date'); // Default sort by date
    const [isEditing, setIsEditing] = useState(false);
    const [editedClientInfo, setEditedClientInfo] = useState({});
    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [errors, setErrors] = useState({});
    const [isAddPurchaseModalOpen, setIsAddPurchaseModalOpen] = useState(false); // New state for modal
    const [currentPage, setCurrentPage] = useState(1); // Track current page
    const itemsPerPage = 4; // Max items per page
    const [deleteClientId, setDeleteClientId] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);




    useEffect(() => {
        if (successMessage) {
            const timer = setTimeout(() => {
                setSuccessMessage('');
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [successMessage]);
    const fetchClientData = async () => {
        try {
            const clientResponse = await apiService.getClientById(clientId);
            setClientInfo(clientResponse.data);

            const ordersResponse = await apiService.getPurchasesByClientId(clientId);
            setOrders(ordersResponse.data);
            console.log(ordersResponse.data);

            // Calculate total sales including partial payments
            const total = ordersResponse.data.reduce((sum, order) => {
                if (Array.isArray(order.payments) && order.payments.length > 0) {
                    const paymentsSum = order.payments.reduce(
                        (paymentSum, payment) => paymentSum + parseFloat(payment.amount_paid || 0),
                        0
                    );
                    return sum + paymentsSum;
                } else if (order.payment_status === 'Paid') {
                    return sum + parseFloat(order.amount || 0);
                }
                return sum;
            }, 0);

            setTotalSales(total);
        } catch (error) {
            console.error('Error fetching client data:', error);
        }
    };


    useEffect(() => {
        fetchClientData();
    }, [clientId]);

    const handleAddOrder = () => {
        setIsAddPurchaseModalOpen(true); // Open AddPurchaseModal
    };

    const closeAddPurchaseModal = () => {
        setIsAddPurchaseModalOpen(false); // Close AddPurchaseModal
        fetchClientData(); // Refresh data after modal closes
    };

    const handleUpdateClient = () => {
        setIsEditing(true);
        setEditedClientInfo({ ...clientInfo }); // Copy current client data
    };

    const handleSaveEdit = async () => {
        const validateFields = () => {
            const newErrors = {};

            if (!editedClientInfo.first_name?.trim()) {
                newErrors.firstName = 'First name is required';
            }

            if (!editedClientInfo.last_name?.trim()) {
                newErrors.lastName = 'Last name is required';
            }

            if (!editedClientInfo.contact_details?.trim()) {
                newErrors.contactDetail =
                    editedClientInfo.contact_method === 'phone'
                        ? 'Phone number is required'
                        : 'Email address is required';
            } else if (
                editedClientInfo.contact_method === 'email' &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editedClientInfo.contact_details)
            ) {
                newErrors.contactDetail = 'Invalid email address';
            }

            setErrors(newErrors);
            return Object.keys(newErrors).length === 0;
        };

        if (!validateFields()) {
            return; // Exit if validation fails
        }

        try {
            await apiService.updateClient(clientId, editedClientInfo);
            setSuccessMessage('Client information updated successfully.');
            setIsEditing(false);
            fetchClientData(); // Refresh data after save

            // Optional: Clear success message after a few seconds
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
            console.error('Error updating client:', error);
            setErrorMessage('Failed to update client information. Please try again.');
        }
    };

    const removeOrder = (orderId) => {
        setOrders((prevOrders) => prevOrders.filter((order) => order.id !== orderId));
        setSuccessMessage('Order deleted successfully!'); // Update success message
    };



    const handleCancelEdit = () => {
        setIsEditing(false);
        setEditedClientInfo({}); // Reset edited data
    };

    const confirmDelete = (clientId) => {
        setDeleteClientId(clientId);
        setIsConfirmModalOpen(true);
    };
    const handleDelete = async () => {
        try {
            const response = await apiService.deleteClient(deleteClientId);
            if (response.data.success) {
                setClients(prevClients => prevClients.filter(client => client.id !== deleteClientId));
                setSuccessMessage('Client successfully deleted');
                setTimeout(() => setSuccessMessage(''), 3000);
            } else {
                console.error(response.data.message || 'Failed to delete client');
            }
        } catch (error) {
            console.error('Error deleting client:', error);
        } finally {
            setIsConfirmModalOpen(false);
            setDeleteClientId(null);
        }
    };


    const formatContactDetails = (contactDetails) => {
        // Simple logic to format phone numbers and emails
        if (contactDetails.includes('@')) {
            // It's an email
            return <a href={`mailto:${contactDetails}`}>{contactDetails}</a>;
        } else {
            // Assume it's a phone number
            const formattedNumber = contactDetails.replace(
                /(\d{3})(\d{3})(\d{4})/,
                '($1) $2-$3'
            );
            return <a href={`tel:${contactDetails}`}>{formattedNumber}</a>;
        }
    };

    const sortOrders = (orders, criteria) => {
        switch (criteria) {
            case 'date':
                return orders.slice().sort((a, b) => new Date(b.purchase_date) - new Date(a.purchase_date));
            case 'unpaid':
                return orders.slice().filter((o) => o.payment_status !== 'Paid');
            case 'paid':
                return orders.slice().filter((o) => o.payment_status === 'Paid');
            default:
                return orders;
        }
    };

    const calculateRemainingBalance = (order) => {
        if (!order) return 0;
        const totalPaid = (order.payments || []).reduce(
            (sum, payment) => sum + parseFloat(payment.amount_paid || 0),
            0
        );
        return parseFloat(order.amount || 0) - totalPaid;
    };


    const paginateOrders = (sortedOrders) => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return sortedOrders.slice(startIndex, endIndex);
    };

    // Handle page changes
    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const sortedOrders = sortOrders(orders, sortOption);
    const paginatedOrders = paginateOrders(sortedOrders);


    return (
        <div className="p-6">
            {/* Success/Error Message */}
            {successMessage && (
                <div className="bg-green-100 text-green-700 p-4 mb-4 rounded">
                    {successMessage}
                </div>
            )}
            {errorMessage && (
                <div className="bg-red-100 text-red-700 p-4 mb-4 rounded">
                    {errorMessage}
                </div>
            )}

            {/* Client Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    {isEditing ? (
                        <>
                            {/* Editable First Name */}
                            <input
                                type="text"
                                value={editedClientInfo.first_name || ''}
                                onChange={(e) =>
                                    setEditedClientInfo({
                                        ...editedClientInfo,
                                        first_name: e.target.value,
                                    })
                                }
                                className="text-2xl font-bold border-b border-gray-300 mb-2 bg-yellow-100"
                                placeholder="First Name"
                            />
                            {errors?.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}

                            {/* Editable Last Name */}
                            <input
                                type="text"
                                value={editedClientInfo.last_name || ''}
                                onChange={(e) =>
                                    setEditedClientInfo({
                                        ...editedClientInfo,
                                        last_name: e.target.value,
                                    })
                                }
                                className="text-2xl font-bold border-b border-gray-300 mb-2 bg-yellow-100"
                                placeholder="Last Name"
                            />
                            {errors?.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}

                            {/* Editable Contact Details */}
                            <div className="mb-4">
                                <label className="font-semibold">Contact Method:</label>
                                <div className="flex items-center mt-2">
                                    {/* Radio Button for Email */}
                                    <label className="flex items-center mr-4">
                                        <input
                                            type="radio"
                                            name="contactMethod"
                                            value="email"
                                            checked={editedClientInfo.contact_method === 'email'}
                                            onChange={() => {
                                                setEditedClientInfo((prev) => ({
                                                    ...prev,
                                                    phone: prev.contact_method === 'phone' ? prev.contact_details : prev.phone, // Save current phone details
                                                    contact_method: 'email',
                                                    contact_details: prev.email || '', // Restore email details
                                                }));
                                            }}
                                            className="form-radio"
                                        />
                                        <span className="ml-2">Email</span>
                                    </label>
                                    {/* Radio Button for Phone */}
                                    <label className="flex items-center">
                                        <input
                                            type="radio"
                                            name="contactMethod"
                                            value="phone"
                                            checked={editedClientInfo.contact_method === 'phone'}
                                            onChange={() => {
                                                setEditedClientInfo((prev) => ({
                                                    ...prev,
                                                    email: prev.contact_method === 'email' ? prev.contact_details : prev.email, // Save current email details
                                                    contact_method: 'phone',
                                                    contact_details: prev.phone || '', // Restore phone details
                                                }));
                                            }}
                                            className="form-radio"
                                        />
                                        <span className="ml-2">Phone</span>
                                    </label>
                                </div>

                                {/* Input Field for Contact Details */}
                                <input
                                    type="text"
                                    value={editedClientInfo.contact_details || ''}
                                    onChange={(e) => {
                                        const newValue = e.target.value;
                                        setEditedClientInfo((prev) => ({
                                            ...prev,
                                            contact_details: newValue,
                                            email: prev.contact_method === 'email' ? newValue : prev.email,
                                            phone: prev.contact_method === 'phone' ? newValue : prev.phone,
                                        }));
                                    }}
                                    className={`text-gray-900 border-b border-gray-300 w-full mt-2 bg-yellow-100 ${errors?.contactDetail ? 'border-red-500' : ''
                                        }`}
                                    placeholder={
                                        editedClientInfo.contact_method === 'email'
                                            ? 'Enter email address'
                                            : 'Enter phone number'
                                    }
                                />
                                {errors?.contactDetail && (
                                    <p className="text-red-500 text-sm">{errors.contactDetail}</p>
                                )}
                            </div>
                            {/* Editable Additional Notes */}
                            <textarea
                                value={editedClientInfo.additional_notes || ''}
                                onChange={(e) =>
                                    setEditedClientInfo({
                                        ...editedClientInfo,
                                        additional_notes: e.target.value,
                                    })
                                }
                                className="text-gray-900 border border-gray-300 rounded-lg w-full p-2 bg-yellow-100"
                                placeholder="Additional Notes"
                                rows={3}
                            />
                        </>
                    ) : (
                        <>
                            {/* Display First and Last Name */}
                            <h1 className="text-3xl font-bold">
                                {clientInfo
                                    ? `${clientInfo.first_name} ${clientInfo.last_name}`
                                    : 'Client Details'}
                            </h1>

                            {/* Display Contact Details */}
                            {clientInfo?.contact_details && (
                                <p className="text-gray-600 flex items-center">
                                    {clientInfo.contact_details.includes('@') ? (
                                        <>
                                            <FaEnvelope className="mr-2" />
                                            {formatContactDetails(clientInfo.contact_details)}
                                        </>
                                    ) : (
                                        <>
                                            <FaPhoneAlt className="mr-2" />
                                            {formatContactDetails(clientInfo.contact_details)}
                                        </>
                                    )}
                                </p>
                            )}

                            {/* Display Additional Notes */}
                            {clientInfo?.additional_notes && (
                                <p className="text-gray-600 mt-2">
                                    <strong>Additional Notes:</strong> {clientInfo.additional_notes}
                                </p>
                            )}
                        </>
                    )}
                </div>
                <div className="mb-4">
                    <h2 className="text-2xl font-semibold">Total Sales:</h2>
                    <p className="text-2xl font-bold">${totalSales.toFixed(2)}</p>
                </div>
                <div className="flex space-x-2">
                    {isEditing ? (
                        <>
                            <button
                                onClick={handleSaveEdit}
                                className="flex items-center bg-green-500 hover:bg-green-600 text-white py-2 px-3 rounded"
                            >
                                <FaSave className="mr-1" /> Save
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="flex items-center bg-gray-500 hover:bg-gray-600 text-white py-2 px-3 rounded"
                            >
                                <FaTimes className="mr-1" /> Cancel
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={handleUpdateClient}
                                className="flex items-center bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded"
                            >
                                <FaEdit className="mr-1" /> Edit Info
                            </button>
                            <button
                                onClick={() => confirmDelete(clientId)}
                                className="flex items-center bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded"
                            >
                                <FaTrash className="mr-1" /> Delete Client
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Actions Toolbar */}
            <div className="flex space-x-4 mb-6">
                <button
                    onClick={handleAddOrder}
                    className="flex items-center bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded"
                >
                    <FaPlus className="mr-2" /> Add Order
                </button>
            </div>

            {/* Sorting Controls */}
            <div className="mb-4">
                <label className="mr-2 font-semibold">Sort Orders By:</label>
                <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="border border-gray-300 px-2 py-1 rounded"
                >
                    <option value="date">Date</option>
                    <option value="unpaid">Unpaid</option>
                    <option value="paid">Paid</option>
                </select>
            </div>

            {/* Add Purchase Modal */}
            {isAddPurchaseModalOpen && (
                <AddPurchaseModal
                    clientId={clientId} // Pass client ID
                    onClose={closeAddPurchaseModal}
                    onSuccess={(message) => setSuccessMessage(message)}
                />
            )}

            {/* Orders and Payments */}
            {/* Orders Section */}
            <div className="max-h-screen overflow-y-auto">
                <h2 className="text-2xl font-semibold mb-4">Orders:</h2>
                {paginatedOrders.length > 0 ? (
                    paginatedOrders.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            clientId={clientId}
                            remainingBalance={order.payment_status === 'Partial' ? calculateRemainingBalance(order) : null}
                            refreshData={fetchClientData}
                            removeOrder={removeOrder} // Pass removeOrder function

                        />
                    ))
                ) : (
                    <p>No orders found.</p>
                )}
            </div>

            {/* Pagination Controls */}
            <div className="flex justify-center mt-4">
                <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-4 py-2 mr-2 rounded-lg border ${currentPage === 1 ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                >
                    Previous
                </button>
                <span className="px-4 py-2">Page {currentPage} of {Math.ceil(sortedOrders.length / itemsPerPage)}</span>
                <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === Math.ceil(sortedOrders.length / itemsPerPage)}
                    className={`px-4 py-2 ml-2 rounded-lg border ${currentPage === Math.ceil(sortedOrders.length / itemsPerPage) ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 text-white hover:bg-blue-600'}`}
                >
                    Next
                </button>
            </div>
             {/* Confirmation Modal */}
             {isConfirmModalOpen && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg">
                        <h2 className="text-lg font-bold mb-4">Confirm Deletion</h2>
                        <p>Are you sure you want to delete this client?</p>
                        <div className="flex justify-end mt-4">
                            <button
                                onClick={() => {
                                    setIsConfirmModalOpen(false);
                                    setDeleteClientId(null);
                                }}
                                className="mr-4 bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg"
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

export default ClientIDPage;
