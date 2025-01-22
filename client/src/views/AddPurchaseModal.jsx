import React, { useState, useEffect, useCallback } from 'react';
import apiService from '../services/apiService';
import Select, { components } from 'react-select';
import { Modal } from 'react-responsive-modal';
import 'react-responsive-modal/styles.css';
import { AsyncPaginate } from 'react-select-async-paginate';



const AddPurchaseModal = ({ clientId, onClose, onSuccess }) => {
    const [selectedClient, setSelectedClient] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isMultipleOrder, setIsMultipleOrder] = useState(false);
    const [items, setItems] = useState([]);
    const [selectedSize, setSelectedSize] = useState('');
    const [customSize, setCustomSize] = useState('');
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
    const [amount, setAmount] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [newPurchaseId, setNewPurchaseId] = useState(null);

    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(true);
    const [isImageModalOpen, setIsImageModalOpen] = useState(false);
    const [imageToShow, setImageToShow] = useState('');
    const [selectedQuantity, setSelectedQuantity] = useState(1); // Default quantity is 1
    const [orderTotalAmount, setOrderTotalAmount] = useState(0);


    const [addPaymentNow, setAddPaymentNow] = useState(false);

    // New state for payment modal
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [amountPaid, setAmountPaid] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('Credit Card'); // Default to Credit Card
    const [customPaymentMethod, setCustomPaymentMethod] = useState(''); // For "Other" payment method
    const [paymentErrors, setPaymentErrors] = useState({});
    const [warningMessage, setWarningMessage] = useState('');

    const loadClients = async (search, loadedOptions, { page }) => {
        const response = await apiService.allClients(page, search);
        const newClients = response.data.clients || [];
        const options = newClients.map((client) => ({
            value: client.id,
            label: `${client.first_name} ${client.last_name}`,
        }));

        return {
            options,
            hasMore: newClients.length === 20, // Determines if there are more results
            additional: {
                page: page + 1,
            },
        };
    };

    useEffect(() => {
        if (clientId) {
            (async () => {
                let matchedClient = null;
                let page = 1;

                try {
                    while (!matchedClient) {
                        const response = await apiService.allClients(page, ''); // Load the current page
                        const newClients = response.data.clients || [];

                        // Attempt to find the client on the current page
                        matchedClient = newClients.find(
                            (client) => client.id.toString() === clientId.toString()
                        );

                        if (matchedClient) {
                            setSelectedClient({
                                value: matchedClient.id,
                                label: `${matchedClient.first_name} ${matchedClient.last_name}`,
                            });
                            console.log('Matched client found:', matchedClient);
                            break;
                        }

                        // If no more clients are returned, stop
                        if (newClients.length < 20) {
                            console.warn('Client ID not found in any page.');
                            break;
                        }

                        // Increment page to fetch the next set of clients
                        page += 1;
                    }
                } catch (error) {
                    console.error('Error fetching client data:', error);
                }
            })();
        }
    }, [clientId]);





    const loadProducts = async (search, loadedOptions, { page }) => {
        const response = await apiService.getAllProducts(page, search);
        const newProducts = response.data.products || [];
        const options = newProducts.map((product) => ({
            value: product.id,
            label: product.name,
            image: product.screenshot_photo,
            price: product.price,
        }));

        return {
            options,
            hasMore: newProducts.length === 12,
            additional: {
                page: page + 1,
            },
        };
    };


    const handleSearchChange = (term) => {
        setSearchTerm(term);
    };


    const validateFields = () => {
        const newErrors = {};

        // Validate client selection
        if (!selectedClient) newErrors.selectedClient = 'Client is required.';

        if (isMultipleOrder) {
            // For multiple orders
            if (items.length === 0) {
                newErrors.items = 'At least one product must be added to the order.';
            }

            if (selectedProduct && (!selectedQuantity || selectedQuantity <= 0)) {
                newErrors.selectedQuantity = 'Quantity must be at least 1.';
            }

            if (selectedProduct && !selectedSize) {
                newErrors.selectedSize = 'Size is required for the product.';
            }

            if (selectedSize === 'Custom' && !customSize.trim()) {
                newErrors.customSize = 'Custom size is required.';
            }
        } else {
            // For single orders
            if (!selectedProduct) newErrors.selectedProduct = 'Product is required.';
            if (!selectedSize) newErrors.selectedSize = 'Size is required.';
            if (selectedSize === 'Custom' && !customSize.trim()) {
                newErrors.customSize = 'Custom size is required.';
            }
            if (!amount || isNaN(amount) || amount <= 0) {
                newErrors.amount = 'Valid amount is required.';
            }
        }

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


        if (isMultipleOrder && items.length === 0) {
            setErrors({ items: 'At least one item must be added.' });
            return;
        }

        setIsLoading(true);


        const payload = isMultipleOrder
            ? {
                client_id: clientId || selectedClient.value,
                items: items.map((item) => ({
                    product_id: item.productId,
                    size: item.size,
                    quantity: item.quantity,
                    price_per_item: item.pricePerItem,
                })),
                purchase_date: purchaseDate,
                amount: parseFloat(amount),
            }
            : {
                client_id: clientId || selectedClient.value,
                product_id: selectedProduct.value,
                size: selectedSize === 'Custom' ? customSize : selectedSize,
                purchase_date: purchaseDate,
                amount: parseFloat(amount),
                payment_status: 'Pending',
                shipping_status: 'Pending',
                price_per_item: parseFloat(selectedProduct.price),
                
            };
        try {
            const response = await apiService.createPurchase(payload);
            setNewPurchaseId(response.data.purchase_id); // Store the new purchase ID

            if (addPaymentNow) {
                setIsPurchaseModalOpen(false); // Hide the purchase modal
                setIsPaymentModalOpen(true); // Open the payment modal
            } else {
                onSuccess('Order created successfully!',); // Show success message
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

    const handleAddProduct = () => {
        const newErrors = {};
        if (!selectedProduct) newErrors.selectedProduct = 'Product is required.';
        if (!selectedSize) newErrors.selectedSize = 'Size is required.';
        if (!selectedQuantity || selectedQuantity <= 0)
            newErrors.selectedQuantity = 'Quantity must be at least 1.';
        setErrors(newErrors);

        if (Object.keys(newErrors).length > 0) return;

        const newItem = {
            productId: selectedProduct.value,
            productName: selectedProduct.label,
            size: selectedSize,
            quantity: parseInt(selectedQuantity, 10),
            pricePerItem: selectedProduct.price,
        };

        setItems([...items, newItem]);
        setSelectedProduct(null);
        setSelectedSize('');
        setSelectedQuantity(1); // Reset quantity to default
        setErrors({});
    };


    const handleRemoveProduct = (index) => {
        const updatedItems = [...items];
        updatedItems.splice(index, 1);
        setItems(updatedItems);
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
            await apiService.updatePurchaseStatus(newPurchaseId, updateData);

            setIsPaymentModalOpen(false); // Close the payment modal
            onSuccess('Payment added successfully'); // Show success message
            onClose(); // Close the component
        } catch (error) {
            console.error('Error creating payment or updating purchase:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (amount) {
          setOrderTotalAmount(parseFloat(amount));
        } else {
          setOrderTotalAmount(0);
        }
      }, [amount]);
      


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
                    <div
                        className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg"
                        style={{
                            maxHeight: '100vh', // Set a max height for the modal
                            overflowY: 'auto', // Enable scrolling when content exceeds max height
                        }}
                    >
                        <h2 className="text-xl font-bold mb-4" >Create New Order</h2>
                        <div className="flex items-center mb-4" >
                            <label className="mr-4 font-semibold">Order Type:</label>
                            <button
                                onClick={() => setIsMultipleOrder(false)}
                                className={`py-2 px-4 rounded-lg ${!isMultipleOrder ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                            >
                                Single
                            </button>
                            <button
                                onClick={() => setIsMultipleOrder(true)}
                                className={`py-2 px-4 rounded-lg ml-2 ${isMultipleOrder ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
                            >
                                Multiple
                            </button>
                        </div>

                        <form onSubmit={handleSubmit}>
                            {/* Client Selection */}
                            <label className="block mb-2 font-semibold">Select Client</label>
                            <AsyncPaginate
                                value={selectedClient}
                                loadOptions={loadClients}
                                onChange={setSelectedClient}
                                placeholder="Search and select client..."
                                debounceTimeout={300}
                                isDisabled={!!clientId}
                                additional={{ page: 1 }}
                                styles={{
                                    control: (base) =>
                                        errors.selectedClient ? { ...base, borderColor: 'red' } : base,
                                }}
                                className="mb-4"
                                isClearable={!clientId} // Prevent clearing if clientId is provided

                            />
                            {errors.selectedClient && (
                                <p className="text-red-500 text-sm">{errors.selectedClient}</p>
                            )}
                            {isMultipleOrder ? (
                                <>
                                    {/* Add Product Section for Multiple Orders */}
                                    <div className="mb-1">
                                        <label className="block mb-2 font-semibold">Add Product</label>
                                        <AsyncPaginate
                                            value={selectedProduct}
                                            loadOptions={loadProducts}
                                            onChange={setSelectedProduct}
                                            placeholder="Search and select product..."
                                            debounceTimeout={300}
                                            additional={{ page: 1 }}
                                            components={{
                                                Option: ProductOption,
                                                SingleValue: ProductSingleValue,
                                            }}
                                            styles={{
                                                control: (base) =>
                                                    errors.selectedProduct ? { ...base, borderColor: 'red' } : base,
                                            }}
                                            className="mb-2"
                                            isClearable
                                        />
                                        <input
                                            type="number"
                                            placeholder="Quantity"
                                            value={selectedQuantity}
                                            onChange={(e) => setSelectedQuantity(e.target.value)}
                                            className="w-full p-2 mb-2 border border-gray-300 rounded-lg"
                                        />


                                    </div>

                                    {/* Product List for Multiple Orders */}
                                    <div className="mb-4">
                                        <h3 className="font-semibold mb-2">Order Items</h3>
                                        {items.length > 0 ? (
                                            <ul className="list-disc pl-5">
                                                {items.map((item, index) => (
                                                    <li key={index} className="mb-2 flex justify-between">
                                                        <span>
                                                            {item.productName} (x{item.quantity}) - ${item.pricePerItem} ({item.size})
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveProduct(index)}
                                                            className="text-red-500 hover:underline"
                                                        >
                                                            Remove
                                                        </button>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <p className="text-gray-500">No items added yet.</p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Product Selection for Single Order */}
                                    <label className="block mb-2 font-semibold">Select Product</label>
                                    <AsyncPaginate
                                        value={selectedProduct}
                                        loadOptions={loadProducts}
                                        onChange={(selected) => {
                                            setSelectedProduct(selected);
                                            setAmount(selected.price || '');
                                        }}
                                        placeholder="Search and select product..."
                                        debounceTimeout={300}
                                        additional={{ page: 1 }}
                                        components={{
                                            Option: ProductOption,
                                            SingleValue: ProductSingleValue,
                                        }}
                                        styles={{
                                            control: (base) =>
                                                errors.selectedProduct ? { ...base, borderColor: 'red' } : base,
                                        }}
                                        className="mb-4"
                                        isClearable
                                    />
                                    {errors.selectedProduct && (
                                        <p className="text-red-500 text-sm">{errors.selectedProduct}</p>
                                    )}
                                </>
                            )}


                            {/* Size Selection for Single Orders or Adding a Product in Multiple Orders */}
                            {(!isMultipleOrder || (isMultipleOrder && selectedProduct)) && (
                                <div className="mb-4">
                                    <label className="block mb-2 font-semibold">Select Size</label>
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
                                    {selectedSize === 'Custom' && (
                                        <div className="mt-2">
                                            <input
                                                type="text"
                                                value={customSize}
                                                onChange={(e) => setCustomSize(e.target.value)}
                                                className="w-full p-2 border border-gray-300 rounded-lg"
                                                placeholder="Enter custom size"
                                            />
                                        </div>
                                    )}
                                        {/* Only show the “Add Item to Order” button if this is a multiple order scenario */}
                                        {isMultipleOrder && (
                                            <div className="mt-2">
                                                {/* Show button only when product, quantity, and size have been selected */}
                                                {selectedProduct && selectedQuantity && selectedSize && (
                                                    <button
                                                        type="button"
                                                        onClick={handleAddProduct}
                                                        className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg"
                                                    >
                                                        Add Item To Order
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    {errors.selectedSize && <p className="text-red-500 text-sm">{errors.selectedSize}</p>}
                                    {errors.customSize && <p className="text-red-500 text-sm">{errors.customSize}</p>}
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
                                    required
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
                                <span className="ml-2">Add manual payment now</span>
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
                            <img src={imageToShow} alt="Product" className="max-w-full max-h-screen rounded-lg h-auto" />
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
                            Total Amount Due: ${orderTotalAmount.toFixed(2)}
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
