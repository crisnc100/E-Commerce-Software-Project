import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import { FiEdit, FiTrash } from 'react-icons/fi';

const Spinner = () => (
  <div className="w-5 h-5 border-4 border-t-white border-gray-300 rounded-full animate-spin"></div>
);

const ProductsTab = () => {
  const [products, setProducts] = useState([]);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [sortOption, setSortOption] = useState('date');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editProductData, setEditProductData] = useState(null);
  const [newImage, setNewImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await apiService.getAllProducts();
        setProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

  const handleSortChange = (e) => {
    setSortOption(e.target.value);
    const sortedProducts = [...products].sort((a, b) => {
      if (e.target.value === 'date') {
        return new Date(b.uploaded_at) - new Date(a.uploaded_at);
      } else if (e.target.value === 'price') {
        return b.price - a.price;
      }
      return 0;
    });
    setProducts(sortedProducts);
  };

  const handleProductClick = (productId) => {
    setExpandedProductId((prevId) => (prevId === productId ? null : productId));
  };

  const confirmDelete = (productId) => {
    setDeleteProductId(productId);
    setIsConfirmModalOpen(true);
  };

  const handleDelete = async () => {
    try {
      await apiService.deleteProduct(deleteProductId);
      setProducts(prevProducts => prevProducts.filter((product) => product.id !== deleteProductId));
      setSuccessMessage('Product deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      setIsConfirmModalOpen(false);
      setDeleteProductId(null);
    }
  };

  const handleEdit = (product) => {
    setEditProductData(product);
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditProductData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleImageChange = (e) => {
    setNewImage(e.target.files[0]);
  };

  const handleEditSubmit = async () => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', editProductData.name);
      formData.append('description', editProductData.description);
      formData.append('price', editProductData.price);
      if (newImage) {
        formData.append('screenshot_photo', newImage);
      }

      await apiService.updateProduct(editProductData.id, formData);
      setIsEditModalOpen(false);

      // Re-fetch the updated product list
      const response = await apiService.getAllProducts();
      setProducts(response.data);

      setSuccessMessage('Product updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 text-green-700 p-2 mb-4 rounded-md">
          {successMessage}
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <label htmlFor="sort" className="font-semibold mr-2">
          Sort by:
        </label>
        <select
          id="sort"
          value={sortOption}
          onChange={handleSortChange}
          className="p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="date">Upload Date</option>
          <option value="price">Price</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map((product) => (
          <div
            key={product.id}
            className="bg-white p-4 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow duration-200"
            onClick={() => handleProductClick(product.id)}
          >
            <img
              src={product.screenshot_photo || 'https://via.placeholder.com/150'}
              alt={product.name}
              className="w-full h-32 object-cover rounded-lg mb-2"
            />
            <h2 className="text-lg font-bold">
              {product.name} - ${product.price}
            </h2>
            {expandedProductId === product.id && (
              <div className="mt-2">
                <p className="text-gray-600">{product.description}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Clients who have purchased: {product.clients ? product.clients.join(', ') : 'None'}
                </p>
                <div className="flex justify-end mt-4">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEdit(product);
                    }}
                    className="flex items-center bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-lg mr-2"
                  >
                    <FiEdit className="mr-1" /> Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(product.id);
                    }}
                    className="flex items-center bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded-lg"
                  >
                    <FiTrash className="mr-1" /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold mb-4">Confirm Deletion</h2>
            <p>Are you sure you want to delete this product?</p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setIsConfirmModalOpen(false);
                  setDeleteProductId(null);
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

      {/* Edit Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-sm w-full">
            <h2 className="text-xl font-bold mb-4">Edit Product</h2>
            <label className="block mb-2">Name</label>
            <input
              type="text"
              name="name"
              value={editProductData.name}
              onChange={handleEditChange}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4"
            />
            <label className="block mb-2">Description</label>
            <textarea
              name="description"
              value={editProductData.description}
              onChange={handleEditChange}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4"
            />
            <label className="block mb-2">Price</label>
            <input
              type="number"
              name="price"
              value={editProductData.price}
              onChange={handleEditChange}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4"
            />
            <label className="block mb-2">Upload New Image (optional)</label>
            <input
              type="file"
              name="screenshot_photo"
              onChange={handleImageChange}
              className="w-full p-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex justify-end">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="bg-gray-500 hover:bg-gray-600 text-white py-1 px-3 rounded-lg mr-2"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleEditSubmit}
                className={`bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-lg flex items-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isLoading}
              >
                {isLoading && <Spinner className="mr-2" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductsTab;
