import React, { useState } from 'react';
import apiService from '../services/apiService';

const UploadProductModal = ({ onClose }) => {
  const [screenshotPhoto, setScreenshotPhoto] = useState(null);
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFileChange = (e) => {
    setScreenshotPhoto(e.target.files[0]);
    setErrorMessage(''); // Clear any previous error message
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('name', productName);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('screenshot_photo', screenshotPhoto);

    try {
      const response = await apiService.createProduct(formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setSuccessMessage(response.data.message);
      setErrorMessage('');

      // Clear form fields
      setProductName('');
      setDescription('');
      setPrice('');
      setScreenshotPhoto(null);

      // Close the modal after a delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error creating product:', error);

      // Handle specific backend error messages
      if (error.response?.data?.error) {
        setErrorMessage(error.response.data.error); // Set the specific error message from the backend
      } else {
        setErrorMessage('Failed to upload product. Please try again.');
      }
      setSuccessMessage('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Upload Product</h2>

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

        <form onSubmit={handleSubmit}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            required
            className="mb-4"
            disabled={!!successMessage}
          />
          <input
            type="text"
            placeholder="Product Name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
            className="w-full p-2 mb-4 border border-gray-300 rounded-lg"
            disabled={!!successMessage}
          />
          <textarea
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 mb-4 border border-gray-300 rounded-lg resize-y"
            rows="4"
            disabled={!!successMessage}
          />
          <div className="flex items-center border border-gray-300 rounded-lg mb-4">
            <span className="px-3 bg-gray-200 text-gray-700">$</span>
            <input
              type="number"
              placeholder="Price"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="w-full p-2 border-l border-gray-300 rounded-r-lg focus:outline-none"
              disabled={!!successMessage}
            />
          </div>

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
              disabled={isSubmitting || !!successMessage}
            >
              {isSubmitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadProductModal;
