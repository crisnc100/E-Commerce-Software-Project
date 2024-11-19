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
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [imageToShow, setImageToShow] = useState('');

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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateFields()) return;

    setIsLoading(true);

    const sizeToSave = selectedSize === 'Custom' ? customSize : selectedSize;

    const purchaseData = {
      client_id: selectedClient.value,
      product_id: selectedProduct.value,
      size: sizeToSave,
      purchase_date: new Date().toISOString().split('T')[0],
      amount: parseFloat(amount),
      payment_status: 'Pending',
      shipping_status: 'Pending',
    };

    try {
      await apiService.createPurchase(purchaseData);
      onSuccess('Purchase created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating purchase:', error);
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
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">Create New Purchase</h2>
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
                className={`w-full p-2 border ${
                  errors.customSize ? 'border-red-500' : 'border-gray-300'
                } rounded-lg`}
                placeholder="Enter custom size"
              />
              {errors.customSize && (
                <p className="text-red-500 text-sm">{errors.customSize}</p>
              )}
            </div>
          )}

          {/* Amount */}
          <label className="block mb-2 font-semibold">Amount</label>
          <div className="flex items-center border border-gray-300 rounded-lg mb-4">
            <span className="px-3 bg-gray-200 text-gray-700">$</span>
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full p-2 border-l border-gray-300 rounded-r-lg focus:outline-none ${
                errors.amount ? 'border-red-500' : ''
              }`}
            />
          </div>
          {errors.amount && <p className="text-red-500 text-sm">{errors.amount}</p>}

          {/* Buttons */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="mr-4 bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create Purchase'}
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
  );
};

export default AddPurchaseModal;
