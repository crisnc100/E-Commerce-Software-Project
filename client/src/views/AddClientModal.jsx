import React, { useState } from 'react';
import apiService from '../services/apiService';

const AddClientModal = ({ onClose, onSuccess }) => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [contactMethod, setContactMethod] = useState('phone');
    const [contactDetail, setContactDetail] = useState('');
    const [preferredPaymentMethod, setPreferredPaymentMethod] = useState('');
    const [otherPaymentMethod, setOtherPaymentMethod] = useState('');
    const [additionalNotes, setAdditionalNotes] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [successMessage, setSuccessMessage] = useState('');


    const validateFields = () => {
        const newErrors = {};

        if (!firstName.trim()) newErrors.firstName = 'First name is required';
        if (!lastName.trim()) newErrors.lastName = 'Last name is required';

        if (!contactDetail.trim()) {
            newErrors.contactDetail = contactMethod === 'phone'
                ? 'Phone number is required'
                : 'Email address is required';
        } else if (contactMethod === 'phone' && !/^\d{10}$/.test(contactDetail)) {
            newErrors.contactDetail = 'Invalid phone number';
        } else if (contactMethod === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactDetail)) {
            newErrors.contactDetail = 'Invalid email address';
        }

        if (!preferredPaymentMethod) {
            newErrors.preferredPaymentMethod = 'Please select a payment method';
        } else if (preferredPaymentMethod === 'Other' && !otherPaymentMethod.trim()) {
            newErrors.otherPaymentMethod = 'Please specify other payment method';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateFields()) return;
        setIsLoading(true);

        const clientData = {
            first_name: firstName,
            last_name: lastName,
            contact_method: contactMethod,
            contact_details: contactDetail,
            preferred_payment_method: preferredPaymentMethod === 'Other' ? otherPaymentMethod : preferredPaymentMethod,
            additional_notes: additionalNotes,
        };

        try {
            const response = await apiService.addClient(clientData);
            onSuccess(response.data.message);
            onClose();
        } catch (error) {
            console.error('Error adding client:', error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
                <h2 className="text-lg font-bold mb-4">New Customer</h2>
                <form onSubmit={handleSubmit}>
                    {/* First Name Input */}
                    <input
                        type="text"
                        placeholder="First Name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className={`w-full p-2 mb-2 border ${errors.firstName ? 'border-red-500' : 'border-gray-300'} rounded-lg`}
                    />
                    {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName}</p>}

                    {/* Last Name Input */}
                    <input
                        type="text"
                        placeholder="Last Name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className={`w-full p-2 mb-2 border ${errors.lastName ? 'border-red-500' : 'border-gray-300'} rounded-lg`}
                    />
                    {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName}</p>}

                    {/* Contact Method */}
                    <div className="mb-4">
                        <label className="font-semibold mb-2 block">Contact Method</label>
                        <div className="flex items-center mb-2">
                            <input
                                type="radio"
                                id="contactPhone"
                                name="contactMethod"
                                value="phone"
                                checked={contactMethod === 'phone'}
                                onChange={(e) => setContactMethod(e.target.value)}
                                className="mr-2"
                            />
                            <label htmlFor="contactPhone" className="mr-4">Phone</label>
                            <input
                                type="radio"
                                id="contactEmail"
                                name="contactMethod"
                                value="email"
                                checked={contactMethod === 'email'}
                                onChange={(e) => setContactMethod(e.target.value)}
                                className="mr-2"
                            />
                            <label htmlFor="contactEmail">Email</label>
                        </div>
                        <input
                            type={contactMethod === 'phone' ? 'tel' : 'email'}
                            placeholder={contactMethod === 'phone' ? 'Phone Number' : 'Email Address'}
                            value={contactDetail}
                            onChange={(e) => setContactDetail(e.target.value)}
                            className={`w-full p-2 mb-2 border ${errors.contactDetail ? 'border-red-500' : 'border-gray-300'} rounded-lg`}
                        />
                        {errors.contactDetail && <p className="text-red-500 text-sm">{errors.contactDetail}</p>}
                    </div>

                    {/* Preferred Payment Method */}
                    <div className="mb-4">
                        <label className="block mb-2">Preferred Payment Method</label>
                        <div className="flex flex-col space-y-2">
                            {['Bank Transfer', 'PayPal', 'Venmo', 'Zelle', 'Other'].map(method => (
                                <label key={method} className="flex items-center">
                                    <input
                                        type="radio"
                                        name="paymentMethod"
                                        value={method}
                                        checked={preferredPaymentMethod === method}
                                        onChange={(e) => setPreferredPaymentMethod(e.target.value)}
                                        className="mr-2"
                                    />
                                    {method}
                                </label>
                            ))}
                            {preferredPaymentMethod === 'Other' && (
                                <input
                                    type="text"
                                    placeholder="Enter other payment method"
                                    value={otherPaymentMethod}
                                    onChange={(e) => setOtherPaymentMethod(e.target.value)}
                                    className={`w-full p-2 border ${errors.otherPaymentMethod ? 'border-red-500' : 'border-gray-300'} rounded-lg`}
                                />
                            )}
                            {errors.preferredPaymentMethod && <p className="text-red-500 text-sm">{errors.preferredPaymentMethod}</p>}
                            {errors.otherPaymentMethod && <p className="text-red-500 text-sm">{errors.otherPaymentMethod}</p>}
                        </div>
                    </div>

                    {/* Additional Notes */}
                    <textarea
                        placeholder="Additional Notes (Optional)"
                        value={additionalNotes}
                        onChange={(e) => setAdditionalNotes(e.target.value)}
                        className="w-full p-2 mb-4 border border-gray-300 rounded-lg resize-y"
                        rows="3"
                    />

                    <div className="flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="mr-4 bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded-lg"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Adding...' : 'Add Client'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddClientModal;
