import React, { useState } from 'react';
import { Modal } from 'react-responsive-modal';
import { AsyncPaginate } from 'react-select-async-paginate';
import apiService from '../services/apiService';

const AddItemToOrderModal = ({ isOpen, onClose, purchaseId, onItemAdded }) => {
  // Local state
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [pricePerItem, setPricePerItem] = useState('');
  const [imageToShow, setImageToShow] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [customSize, setCustomSize] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // You can copy the same product search “loadProducts” logic from your code:
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

  // Handler for “Add Item” button
  const handleAddItem = async () => {
    if (!selectedProduct) {
      setError('Please select a product.');
      return;
    }
    if (!selectedSize) {
      setError('Please select a size.');
      return;
    }
    if (selectedSize === 'Custom' && !customSize.trim()) {
      setError('Please provide a custom size.');
      return;
    }
    if (selectedQuantity <= 0) {
      setError('Quantity must be at least 1.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Prepare the payload
      const payload = {
        purchase_id: purchaseId,
        product_id: selectedProduct.value,
        size: selectedSize === 'Custom' ? customSize : selectedSize,
        quantity: parseInt(selectedQuantity, 10),
        price_per_item: parseFloat(pricePerItem),
      };

      await apiService.addItemToOrder(payload);

      // If successful, close modal & tell parent to refresh
      onItemAdded();    // e.g. parent can refresh the order
      onClose();
    } catch (err) {
      console.error('Error adding item:', err);
      setError('Failed to add item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

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

  // Render
  return (
    <>
      <Modal open={isOpen} onClose={onClose} center>
        <h2 className="text-xl font-bold mb-4">Add Item to Order</h2>
        {error && <p className="text-red-500">{error}</p>}

        {/* Select Product */}
        <label className="block mb-2 font-semibold">Select Product</label>
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
          // (Optional) custom Option/SingleValue components
          className="mb-4"
          isClearable
        />

        {/* Quantity */}
        <label className="block mb-2 font-semibold">Quantity</label>
        <input
          type="number"
          min="1"
          value={selectedQuantity}
          onChange={(e) => setSelectedQuantity(e.target.value)}
          className="w-full p-2 mb-4 border border-gray-300 rounded-lg"
        />

        {/* Size */}
        <label className="block mb-2 font-semibold">Size</label>
        <div className="mb-2">
          {['Small', 'Medium', 'Large', 'X-Large', 'Custom'].map((size) => (
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
        </div>
        {selectedSize === 'Custom' && (
          <div className="mb-4">
            <input
              type="text"
              placeholder="Enter custom size"
              value={customSize}
              onChange={(e) => setCustomSize(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
          </div>
        )}
        {/* Price Per Item */}
        <label className="block mb-2 font-semibold">Price For Item ($)</label>
        <input
          type="number"
          step="0.01"
          value={pricePerItem}
          onChange={(e) => setPricePerItem(e.target.value)}
          className="w-full p-2 mb-4 border border-gray-300 rounded-lg"
        />


        {/* Add Item Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={handleAddItem}
            className={`bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            disabled={isLoading}
          >
            {isLoading ? 'Adding...' : 'Add Item'}
          </button>
        </div>
      </Modal>

      {/* Image Preview Modal */}
      <Modal
        open={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        center
      >
        <img
          src={imageToShow}
          alt="Product"
          className="max-w-full max-h-screen rounded-lg h-auto"
        />
      </Modal>
    </>
  );
};

export default AddItemToOrderModal;
