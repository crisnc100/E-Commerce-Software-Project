import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiService from '../services/apiService';
import OrderCard from './OrderCard'; // We'll create this component
import { FaPlus, FaCreditCard, FaEdit, FaTrash, FaPhoneAlt, FaEnvelope } from 'react-icons/fa';

const ClientIDPage = () => {
    const { clientId } = useParams();
    const [clientInfo, setClientInfo] = useState(null);
    const [orders, setOrders] = useState([]);
    const [totalSales, setTotalSales] = useState(0);
    const [sortOption, setSortOption] = useState('date'); // Default sort by date


    const fetchClientData = async () => {
        try {
            const clientResponse = await apiService.getClientById(clientId);
            setClientInfo(clientResponse.data);

            const ordersResponse = await apiService.getPurchasesByClientId(clientId);
            setOrders(ordersResponse.data);

            // Calculate total sales
            const total = ordersResponse.data
                .filter((order) => order.payment_status === 'Paid')
                .reduce((sum, order) => sum + parseFloat(order.amount || 0), 0);
            setTotalSales(total);
        } catch (error) {
            console.error('Error fetching client data:', error);
        }
    };

    useEffect(() => {
        fetchClientData();
    }, [clientId]);

    const handleAddOrder = () => {
        // Logic to open Add Order modal
    };

    const handleAddPaymentMethod = () => {
        // Logic to open Add Payment Method modal
    };

    const handleUpdateClientInfo = () => {
        // Logic to open Update Client Info modal
    };

    const handleDeleteClient = () => {
        // Logic to confirm and delete client
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

    const sortedOrders = sortOrders(orders, sortOption);

    return (
        <div className="p-6">
            {/* Client Header */}
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h1 className="text-2xl font-bold">
                        {clientInfo
                            ? `${clientInfo.first_name} ${clientInfo.last_name}`
                            : 'Client Details'}
                    </h1>
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
                    {clientInfo?.additional_notes && (
                        <p className="text-gray-600 mt-2">
                            <strong>Additional Notes:</strong> {clientInfo.additional_notes}
                        </p>
                    )}
                </div>
                <div className="mb-4">
                    <h2 className="text-xl font-semibold">Total Sales:</h2>
                    <p className="text-2xl font-bold">${totalSales.toFixed(2)}</p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={handleUpdateClientInfo}
                        className="flex items-center bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded"
                    >
                        <FaEdit className="mr-1" /> Update Info
                    </button>
                    <button
                        onClick={handleDeleteClient}
                        className="flex items-center bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded"
                    >
                        <FaTrash className="mr-1" /> Delete Client
                    </button>
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
                <button
                    onClick={handleAddPaymentMethod}
                    className="flex items-center bg-purple-500 hover:bg-purple-600 text-white py-2 px-4 rounded"
                >
                    <FaCreditCard className="mr-2" /> Add Payment Method
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

            {/* Orders and Payments */}
            {/* Orders Section */}
            <div className="max-h-screen overflow-y-auto">
                <h2 className="text-2xl font-semibold mb-4">Orders:</h2>
                {sortedOrders.length > 0 ? (
                    sortedOrders.map((order) => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            clientId={clientId}
                            refreshData={fetchClientData}
                        />
                    ))
                ) : (
                    <p>No orders found.</p>
                )}
            </div>

        </div>
    );
};

export default ClientIDPage;
