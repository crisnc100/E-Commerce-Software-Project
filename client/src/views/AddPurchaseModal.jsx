import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import Select from 'react-select';
import { Modal } from 'react-responsive-modal';
import 'react-responsive-modal/styles.css';

const AddPurchaseModal = ({ onClose, onSuccess }) => {
    const [clients, setClients] = useState([]);
    const [products, setProducts] = useState([]);

    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [selectedSize, setSelectedSize] = useState('');
    const [customSize, setCustomSize] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [newPurchaseId, setNewPurchaseId] = useState(null);
    const [orderTotalAmount, setOrderTotalAmount] = useState(null);

    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(true);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [imageToShow, setImageToShow] = useState('');

    const [addPaymentNow, setAddPaymentNow] = useState(false);

    // New state for payment modal
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Credit Card'); // Default to Credit Card
    const [customPaymentMethod, setCustomPaymentMethod] = useState(''); // For "Other" payment method
    const [paymentErrors, setPaymentErrors] = useState({});
    const [warningMessage, setWarningMessage] = useState('');

    useEffect(() => {
        // Fetch clients and products on modal load
        const fetchData = async () => {
            try {
                const [clientResponse, productResponse] = await Promise.all([
                    apiService.allClients(),
                    apiService.getAllProducts(),
                ]);

                setClients(clientResponse.data.all_clients || []);
                setProducts(productResponse.data || []);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        // When selected product changes, set the amount to the product's price
        if (selectedProduct) {
            setAmount(selectedProduct.price || '');
        } else {
            setAmount('');
        }
    }, [selectedProduct]);

    const validateFields = () => {
        const newErrors = {};

        if (!selectedClient) newErrors.selectedClient = 'Client is required.';
        if (!selectedProduct) newErrors.selectedProduct = 'Product is required.';
        if (!selectedSize) newErrors.selectedSize = 'Size is required.';
        if (selectedSize === 'Custom' && !customSize.trim())
            newErrors.customSize = 'Custom size is required.';
        if (!amount || isNaN(amount) || amount <= 0)
            newErrors.amount = 'Valid amount is required.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validatePaymentFields = () => {
        const newErrors = {};
        if (!paymentDate) newErrors.paymentDate = 'Payment date is required.';
        if (!amountPaid || isNaN(amountPaid) || amountPaid <= 0)
            newErrors.amountPaid = 'Valid amount is required.';
        if (!paymentMethod.trim()) newErrors.paymentMethod = 'Payment method is required.';
        setPaymentErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateFields()) return;

        setIsLoading(true);

        const sizeToSave = selectedSize === 'Custom' ? customSize : selectedSize;

        const purchaseData = {
            client_id: selectedClient.value,
            product_id: selectedProduct.value,
            size: sizeToSave,
            purchase_date: purchaseDate,
            amount: parseFloat(amount),
            payment_status: 'Pending',
            shipping_status: 'Pending',
        };

        try {
            const response = await apiService.createPurchase(purchaseData);
            setNewPurchaseId(response.data.purchase_id); // Store the new purchase ID
            setOrderTotalAmount(parseFloat(amount)); // Set the total order price

            if (addPaymentNow) {
                setIsPurchaseModalOpen(false); // Hide the purchase modal
                setIsPaymentModalOpen(true); // Open the payment modal
            } else {
                onSuccess('Order created successfully'); // Show success message
                onClose(); // Close the component
            }
        } catch (error) {
            console.error('Error creating purchase:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const closePaymentModal = () => {
        setIsPaymentModalOpen(false);
        onSuccess('Order created successfully');
        onClose(); // Close the component
    };

    const handleAmountPaidChange = (e) => {
        const value = e.target.value;
        setAmountPaid(value);

        const amountDue = parseFloat(orderTotalAmount); // Use orderTotalAmount instead of amount
        const paidAmount = parseFloat(value);

        if (!isNaN(amountDue) && paidAmount < amountDue) {
            setWarningMessage('Warning: The amount paid is less than the total amount due.');
        } else {
            setWarningMessage('');
        }
    };


    const handlePaymentSubmit = async (e) => {
        e.preventDefault();

        if (!validatePaymentFields()) return;

        setIsLoading(true);

        const paymentMethodToSave =
            paymentMethod === 'Other' ? customPaymentMethod.trim() : paymentMethod;

        const paymentData = {
            client_id: selectedClient.value,
            purchase_id: newPurchaseId,
            payment_date: paymentDate,
            amount_paid: parseFloat(amountPaid),
            payment_method: paymentMethodToSave,
        };

        try {
            // Create the payment
            await apiService.createPayment(paymentData);

            // Fetch total amount paid for this purchase
            const paymentsResponse = await apiService.getPaymentsByPurchaseId(newPurchaseId);
            const payments = paymentsResponse.data || [];
            const totalAmountPaid = payments.reduce(
                (sum, payment) => sum + parseFloat(payment.amount_paid),
                0
            );

            // Get the total amount due
            const totalAmountDue = parseFloat(amount);

            // Determine the new payment status
            let paymentStatus = '';
            if (totalAmountPaid >= totalAmountDue) {
                paymentStatus = 'Paid';
            } else if (totalAmountPaid > 0 && totalAmountPaid < totalAmountDue) {
                paymentStatus = 'Partial';
            } else {
                paymentStatus = 'Pending';
            }

            // Update the purchase's payment_status
            const updateData = {
                id: newPurchaseId,
                payment_status: paymentStatus,
            };
            await apiService.updatePurchase(newPurchaseId, updateData);

            setIsPaymentModalOpen(false); // Close the payment modal
            onSuccess('Payment added successfully'); // Show success message
            onClose(); // Close the component
        } catch (error) {
            console.error('Error creating payment or updating purchase:', error);
        } finally {
            setIsLoading(false);
        }
    };


    // Prepare options for react-select
    const clientOptions = clients.map((client) => ({
        value: client.id,
        label: `${client.first_name} ${client.last_name}`,
    }));

    const productOptions = products.map((product) => ({
        value: product.id,
        label: product.name,
        image: product.screenshot_photo,
        price: product.price,
    }));

    // Custom Option Component for Clients
    const ClientOption = ({ innerRef, innerProps, data }) => (
        <div
            ref={innerRef}
            {...innerProps}
            className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer"
        >
            <span>{data.label}</span>
        </div>
    );

    // Custom Option Component for Products
    const ProductOption = ({ innerRef, innerProps, data }) => (
        <div
            ref={innerRef}
            {...innerProps}
            className="flex items-center space-x-2 p-2 hover:bg-gray-100 cursor-pointer"
        >
            <img
                src={data.image || 'https://via.placeholder.com/50'}
                alt={data.label}
                className="w-8 h-8 object-cover rounded"
                onClick={(e) => {
                    e.stopPropagation();
                    setImageToShow(data.image || 'https://via.placeholder.com/150');
                    setIsImageModalOpen(true);
                }}
            />
            <span>{data.label}</span>
        </div>
    );

    // Custom Single Value Component for Products
    const ProductSingleValue = ({ data }) => (
        <div className="flex items-center space-x-2">
            <img
                src={data.image || 'https://via.placeholder.com/50'}
                alt={data.label}
                className="w-6 h-6 object-cover rounded"
            />
            <span>{data.label}</span>
        </div>
    );

    // Size options
    const sizeOptions = ['Small', 'Medium', 'Large', 'X-Large', 'XX-Large', 'Custom'];

    return (
        <>
            {/* Purchase Modal */}
            {isPurchaseModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
                        <h2 className="text-xl font-bold mb-4">Create New Order</h2>
                        <form onSubmit={handleSubmit}>
                            {/* Client Selection */}
                            <label className="block mb-2 font-semibold">Select Client</label>
                            <Select
                                options={clientOptions}
                                value={selectedClient}
                                onChange={setSelectedClient}
                                placeholder="Search and select client..."
                                className="mb-4"
                                components={{ Option: ClientOption }}
                                styles={{
                                    control: (base) => (errors.selectedClient ? { ...base, borderColor: 'red' } : base),
                                }}
                            />
                            {errors.selectedClient && (
                                <p className="text-red-500 text-sm">{errors.selectedClient}</p>
                            )}

                            {/* Product Selection */}
                            <label className="block mb-2 font-semibold">Select Product</label>
                            <Select
                                options={productOptions}
                                value={selectedProduct}
                                onChange={setSelectedProduct}
                                placeholder="Search and select product..."
                                className="mb-4"
                                components={{ Option: ProductOption, SingleValue: ProductSingleValue }}
                                styles={{
                                    control: (base) =>
                                        errors.selectedProduct ? { ...base, borderColor: 'red' } : base,
                                }}
                            />
                            {errors.selectedProduct && (
                                <p className="text-red-500 text-sm">{errors.selectedProduct}</p>
                            )}

                            {/* Size Selection */}
                            <label className="block mb-2 font-semibold">Select Size</label>
                            <div className="mb-4">
                                {sizeOptions.map((size) => (
                                    <label key={size} className="inline-flex items-center mr-4">
                                        <input
                                            type="radio"
                                            name="size"
                                            value={size}
                                            checked={selectedSize === size}
                                            onChange={(e) => setSelectedSize(e.target.value)}
                                            className="form-radio"
                                        />
                                        <span className="ml-2">{size}</span>
                                    </label>
                                ))}
                                {errors.selectedSize && (
                                    <p className="text-red-500 text-sm">{errors.selectedSize}</p>
                                )}
                            </div>

                            {/* Custom Size Input */}
                            {selectedSize === 'Custom' && (
                                <div className="mb-4">
                                    <label className="block mb-2 font-semibold">Enter Custom Size</label>
                                    <input
                                        type="text"
                                        value={customSize}
                                        onChange={(e) => setCustomSize(e.target.value)}
                                        className={`w-full p-2 border ${errors.customSize ? 'border-red-500' : 'border-gray-300'
                                            } rounded-lg`}
                                        placeholder="Enter custom size"
                                    />
                                    {errors.customSize && (
                                        <p className="text-red-500 text-sm">{errors.customSize}</p>
                                    )}
                                </div>
                            )}

                            {/* Purchase Date */}
                            <label className="block mb-2 font-semibold">Order Date</label>
                            <input
                                type="date"
                                value={purchaseDate}
                                onChange={(e) => setPurchaseDate(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-lg mb-4"
                            />

                            {/* Amount */}
                            <label className="block mb-2 font-semibold">Amount</label>
                            <div className="flex items-center border border-gray-300 rounded-lg mb-4">
                                <span className="px-3 bg-gray-200 text-gray-700">$</span>
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className={`w-full p-2 border-l border-gray-300 rounded-r-lg focus:outline-none ${errors.amount ? 'border-red-500' : ''
                                        }`}
                                />
                            </div>
                            {errors.amount && <p className="text-red-500 text-sm">{errors.amount}</p>}

                            {/* Add Payment Now Checkbox */}
                            <label className="inline-flex items-center mt-4">
                                <input
                                    type="checkbox"
                                    checked={addPaymentNow}
                                    onChange={(e) => setAddPaymentNow(e.target.checked)}
                                    className="form-checkbox"
                                />
                                <span className="ml-2">Add payment now</span>
                            </label>

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
                                    {isLoading ? 'Creating...' : 'Create Order'}
                                </button>
                            </div>
                        </form>

                        {/* Image Modal */}
                        <Modal
                            open={isImageModalOpen}
                            onClose={() => setIsImageModalOpen(false)}
                            center
                        >
                            <img src={imageToShow} alt="Product" className="w-full h-auto" />
                        </Modal>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {isPaymentModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h3 className="text-lg font-bold mb-4">Add Payment</h3>
                        {/* Display the total amount due */}
                        <div className="mb-4">
                            <p className="font-semibold">
                                Total Amount Due: ${orderTotalAmount !== null ? orderTotalAmount.toFixed(2) : '0.00'}
                            </p>
                        </div>
                        <form onSubmit={handlePaymentSubmit}>
                            {/* Payment Date */}
                            <label className="block mb-2 font-semibold">Payment Date</label>
                            <input
                                type="date"
                                value={paymentDate}
                                onChange={(e) => setPaymentDate(e.target.value)}
                                className={`w-full p-2 border ${paymentErrors.paymentDate ? 'border-red-500' : 'border-gray-300'
                                    } rounded-lg mb-4`}
                            />
                            {paymentErrors.paymentDate && (
                                <p className="text-red-500 text-sm">{paymentErrors.paymentDate}</p>
                            )}

                            {/* Amount Paid */}
                            <label className="block mb-2 font-semibold">Amount Paid</label>
                            <div className="flex items-center border border-gray-300 rounded-lg mb-2">
                                <span className="px-3 bg-gray-200 text-gray-700">$</span>
                                <input
                                    type="number"
                                    placeholder="Amount Paid"
                                    value={amountPaid}
                                    onChange={handleAmountPaidChange}
                                    className={`w-full p-2 border-l border-gray-300 rounded-r-lg focus:outline-none ${paymentErrors.amountPaid ? 'border-red-500' : ''
                                        }`}
                                />
                            </div>
                            {/* Display warning if amountPaid is less than amount */}
                            {warningMessage && (
                                <p className="text-yellow-500 text-sm mb-2">{warningMessage}</p>
                            )}
                            {paymentErrors.amountPaid && (
                                <p className="text-red-500 text-sm">{paymentErrors.amountPaid}</p>
                            )}

                            {/* Payment Method */}
                            <label className="block mb-2 font-semibold">Payment Method</label>
                            <div className="mb-4">
                                {[
                                    'Credit Card',
                                    'PayPal',
                                    'Venmo',
                                    'Zelle',
                                    'Account Transfer',
                                    'Other',
                                ].map((method) => (
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
                            {/* Error Message for Payment Method */}
                            {paymentErrors.paymentMethod && paymentMethod !== 'Other' && (
                                <p className="text-red-500 text-sm">{paymentErrors.paymentMethod}</p>
                            )}

                            {/* Optional input for custom payment method when "Other" is selected */}
                            {paymentMethod === 'Other' && (
                                <div className="mb-4">
                                    <label className="block mb-2 font-semibold">Enter Payment Method</label>
                                    <input
                                        type="text"
                                        placeholder="Enter payment method"
                                        value={customPaymentMethod}
                                        onChange={(e) => setCustomPaymentMethod(e.target.value)}
                                        className={`w-full p-2 border ${paymentErrors.paymentMethod ? 'border-red-500' : 'border-gray-300'
                                            } rounded-lg`}
                                    />
                                    {paymentErrors.paymentMethod && (
                                        <p className="text-red-500 text-sm">{paymentErrors.paymentMethod}</p>
                                    )}
                                </div>
                            )}

                            {/* Error Message */}
                            {paymentErrors.paymentMethod && (
                                <p className="text-red-500 text-sm">{paymentErrors.paymentMethod}</p>
                            )}


                            {/* Buttons */}
                            <div className="flex justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={closePaymentModal}
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
            )}
        </>
    );
};

export default AddPurchaseModal;
