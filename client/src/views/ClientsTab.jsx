import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import { FiTrash2 } from 'react-icons/fi';
import { NavLink, useNavigate, useParams } from 'react-router-dom';


const ClientTab = () => {
    const [clients, setClients] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredClients, setFilteredClients] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [successMessage, setSuccessMessage] = useState('');
    const [deleteClientId, setDeleteClientId] = useState(null);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const navigate = useNavigate();


    useEffect(() => {
        const fetchClients = async () => {
            try {
                const response = await apiService.allClients();
                if (Array.isArray(response.data.all_clients)) {
                    setClients(response.data.all_clients);
                    setFilteredClients(response.data.all_clients);
                }
            } catch (error) {
                console.error("Error fetching clients:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchClients();
    }, []);

    const confirmDelete = (clientId) => {
        setDeleteClientId(clientId);
        setIsConfirmModalOpen(true);
    };

    const handleViewDetails = (client) => {
        const clientNameSlug = `${client.first_name}-${client.last_name}`.toLowerCase().replace(/ /g, '-');
        navigate(`/dashboard/clients/${client.id}/${clientNameSlug}`);
    };

    const handleDelete = async () => {
        try {
            const response = await apiService.deleteClient(deleteClientId);
            if (response.data.success) {
                setClients(prevClients => prevClients.filter(client => client.id !== deleteClientId));
                setFilteredClients(prevFilteredClients => prevFilteredClients.filter(client => client.id !== deleteClientId));

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

    return (
        <div className="p-6 bg-gray-100 h-full">
            <h2 className="text-2xl font-bold mb-4">Clients</h2>

            {/* Success Message */}
            {successMessage && (
                <div className="bg-green-100 text-green-700 p-2 mb-4 rounded-md">
                    {successMessage}
                </div>
            )}

            <input
                type="text"
                placeholder="Search by name or contact"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
            />

            <div className="bg-white shadow-lg rounded-lg p-4 mt-4">
                {isLoading ? (
                    <p>Loading Clients...</p>
                ) : filteredClients.length > 0 ? (
                    <table className="w-full table-auto">
                        <thead>
                            <tr>
                                <th className="px-4 py-2 text-left">First Name</th>
                                <th className="px-4 py-2 text-left">Last Name</th>
                                <th className="px-4 py-2 text-left">Contact</th>
                                <th className="px-4 py-2 text-left">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClients.map(client => (
                                <tr key={client.id} className="border-t border-gray-300">
                                    <td className="px-4 py-2">{client.first_name}</td>
                                    <td className="px-4 py-2">{client.last_name}</td>
                                    <td className="px-4 py-2">{client.contact_details}</td>
                                    <td className="px-4 py-2 flex items-center space-x-2">
                                        <button
                                            onClick={() => confirmDelete(client.id)}
                                            className="text-red-500 hover:text-red-700"
                                            title="Delete client"
                                        >
                                            <FiTrash2 />
                                        </button>
                                        <button
                                            onClick={() => handleViewDetails(client)}
                                            className="text-blue-500 hover:underline"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-gray-500">No clients found.</p>
                )}
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

export default ClientTab;
