// src/components/UploadProductModal.jsx
import React, { useState } from 'react';
import apiService from '../services/apiService';

const UploadProductModal = ({ onClose }) => {
  const [screenshotPhoto, setScreenshotPhoto] = useState(null);
  const [productName, setProductName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');

  const handleFileChange = (e) => {
    setScreenshotPhoto(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', productName);
    formData.append('description', description);
    formData.append('price', price);
    formData.append('screenshot_photo', screenshotPhoto); // Ensure screenshotPhoto is a File object
  
    try {
      // Assuming `apiService.createProduct` is set up to accept `formData`
      const response = await apiService.createProduct(formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      alert(response.data.message);
      onClose(); // Close the modal or perform any cleanup
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };
  
  

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-1/3">
        <h2 className="text-lg font-bold mb-4">Upload Product</h2>
        <form onSubmit={handleSubmit}>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            required
            className="mb-4"
          />
          <input
            type="text"
            placeholder="Product Name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
            className="w-full p-2 mb-4 border border-gray-300 rounded-lg"
          />
          <textarea
            placeholder="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            className="w-full p-2 mb-4 border border-gray-300 rounded-lg resize-y" // Allow vertical resize
            rows="4" // Initial height
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
            >
              Submit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UploadProductModal;
