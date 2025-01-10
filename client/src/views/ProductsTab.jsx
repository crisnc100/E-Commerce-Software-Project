import React, { useState, useEffect } from 'react';
import apiService from '../services/apiService';
import { FiEdit, FiTrash } from 'react-icons/fi';
import Modal from 'react-modal'; // Modal for enlarging product image
import { NavLink, useNavigate, useParams } from 'react-router-dom';


Modal.setAppElement('#root'); // Set the app root for accessibility

const Spinner = () => (
  <div className="w-5 h-5 border-4 border-t-white border-gray-300 rounded-full animate-spin"></div>
);

const ProductsTab = () => {
  const [products, setProducts] = useState([]);
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [clients, setClients] = useState({});
  const [loadingClients, setLoadingClients] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editProductData, setEditProductData] = useState(null);
  const [newImage, setNewImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSecondConfirmModalOpen, setIsSecondConfirmModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState(''); // Error message state for validation
  const [showImageModal, setShowImageModal] = useState(false);
  const [currentImage, setCurrentImage] = useState(null);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); // Search bar state
  const [sortOption, setSortOption] = useState('dateLatest'); // Default sort
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const navigate = useNavigate();


  // New state variables for clients modal
  const [isClientsModalOpen, setIsClientsModalOpen] = useState(false);
  const [selectedProductClients, setSelectedProductClients] = useState([]);
  const [currentProductId, setCurrentProductId] = useState(null);



  // Fetch products from the backend
  const fetchProducts = async (page = 1, search = '') => {
    setIsLoading(true);
    try {
      const response = await apiService.getAllProducts(page, search);
      console.log('API Response:', response.data); // Log the full response
      const newProducts = response.data.products;
      console.log('Fetched products:', newProducts); // Ensure this is an array
      const totalCount = response.data.total_count;

      // Instead of appending, always replace:
      setProducts(newProducts);
      setTotalPages(Math.ceil(totalCount / 12));
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setIsLoading(false);
    }
  };




  useEffect(() => {
    let sortedProducts = [...products];

    // Sorting logic
    if (sortOption === 'dateLatest') {
      sortedProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } else if (sortOption === 'dateEarliest') {
      sortedProducts.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    } else if (sortOption === 'priceLowToHigh') {
      sortedProducts.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortOption === 'priceHighToLow') {
      sortedProducts.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    }

    setFilteredProducts(sortedProducts);
  }, [products, sortOption]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleSortChange = (e) => setSortOption(e.target.value);

  const handlePageChange = (page) => {
    if (page > 0 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Fetch products whenever the page or search term changes
  useEffect(() => {
    fetchProducts(currentPage, searchTerm);
  }, [currentPage, searchTerm]);


  // Fetch clients when a product card is expanded
  useEffect(() => {
    if (expandedProductId) {
      // Check if we already have clients for this product
      if (!clients[expandedProductId]) {
        setLoadingClients(true);
        apiService
          .getClientsForProduct(expandedProductId)
          .then((response) => {
            setClients((prevClients) => ({
              ...prevClients,
              [expandedProductId]: response.data,
            }));
          })
          .catch((error) => {
            console.error('Error fetching clients:', error);
          })
          .finally(() => {
            setLoadingClients(false);
          });
      }
    }
  }, [expandedProductId]);

  const handleProductClick = (productId) => {
    setExpandedProductId((prevId) => (prevId === productId ? null : productId));
  };

  const handleImageClick = (image) => {
    setCurrentImage(image);
    setShowImageModal(true);
  };

  const confirmDelete = (productId) => {
    setDeleteProductId(productId);
    setIsConfirmModalOpen(true);
  };

  const handleSecondConfirm = () => {
    setIsConfirmModalOpen(false);
    setIsSecondConfirmModalOpen(true);
  };
  const handleDelete = async () => {
    try {
      await apiService.deleteProduct(deleteProductId);
      setProducts((prevProducts) =>
        prevProducts.filter((product) => product.id !== deleteProductId)
      );
      setSuccessMessage('Product and associated orders deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error deleting product:', error);
    } finally {
      setIsSecondConfirmModalOpen(false);
      setDeleteProductId(null);
    }
  };

  const handleEdit = (product) => {
    setEditProductData(product);
    setIsEditModalOpen(true);
    setErrorMessage(''); // Clear previous error message
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditProductData((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleImageChange = (e) => {
    setNewImage(e.target.files[0]);
    setErrorMessage(''); // Clear error if new image is selected
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
      setProducts(response.data.products);

      setSuccessMessage('Product updated successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating product:', error);

      // Handle backend validation error for duplicate images
      if (error.response?.data?.error) {
        setErrorMessage(error.response.data.error);
      } else {
        setErrorMessage('Failed to update product. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewClients = (e, productId) => {
    e.stopPropagation();
    setSelectedProductClients(clients[productId]);
    setIsClientsModalOpen(true);
  };

  const formatDateSafely = (dateString) => {
    if (!dateString) return 'Unknown Date';

    const date = new Date(dateString);

    // Ensure the date is valid
    if (isNaN(date)) {
      console.error(`Invalid date: ${dateString}`);
      return 'Unknown Date';
    }

    // Format the date to the user's local time
    return date.toLocaleDateString('en-US'); // Add time zone abbreviation
  };




  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Products</h1>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-100 text-green-700 p-2 mb-4 rounded-md">
          {successMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row justify-between items-center mb-6">
        {/* Search Bar */}
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="p-2 w-full sm:w-1/2 rounded-lg border border-gray-300 mb-4 sm:mb-0 sm:mr-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        {/* Sort Options */}
        <select
          value={sortOption}
          onChange={handleSortChange}
          className="p-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="dateLatest">Date: Latest</option>
          <option value="dateEarliest">Date: Earliest</option>
          <option value="priceLowToHigh">Price: Low to High</option>
          <option value="priceHighToLow">Price: High to Low</option>
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="bg-white p-4 rounded-lg shadow-lg cursor-pointer hover:shadow-xl transition-shadow duration-200"
            onClick={() => handleProductClick(product.id)}
          >
            <img
              src={product.screenshot_photo || 'https://via.placeholder.com/150'}
              alt={product.name}
              className="w-full h-32 object-cover rounded-lg mb-2 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleImageClick(product.screenshot_photo);
              }}
            />
            <h2 className="text-lg font-bold">
              {product.name} - ${product.price}
            </h2>
            {expandedProductId === product.id && (
              <div className="mt-2">
                <p className="text-gray-600">{product.description}</p>

                {/* Loading Spinner */}
                {loadingClients && expandedProductId === product.id ? (
                  <div className="flex justify-center items-center my-4">
                    <Spinner />
                  </div>
                ) : clients[product.id] && clients[product.id].length > 0 ? (
                  <button
                    onClick={(e) => handleViewClients(e, product.id)}
                    className="mt-2 text-blue-500 hover:underline"
                  >
                    View Clients
                  </button>
                ) : (
                  <p className="text-sm text-gray-500 mt-2">
                    No clients have purchased this product.
                  </p>
                )}
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

      {/* Pagination Controls */}
      <div className="flex justify-center mt-6">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-4 py-2 mr-2 rounded-lg border ${currentPage === 1
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
        >
          Previous
        </button>
        <span className="px-4 py-2">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-4 py-2 ml-2 rounded-lg border ${currentPage === totalPages
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-blue-500 text-white hover:bg-blue-600'
            }`}
        >
          Next
        </button>
      </div>


      {/* Image Modal */}
      {showImageModal && (
        <Modal
          isOpen={showImageModal}
          onRequestClose={() => setShowImageModal(false)}
          contentLabel="Product Image"
          className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-75"
          overlayClassName="bg-black bg-opacity-75"
        >
          <img
            src={currentImage}
            alt="Product"
            className="max-w-full max-h-screen rounded-lg"
          />
          <button
            onClick={() => setShowImageModal(false)}
            className="absolute top-5 right-5 bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg"
          >
            Close
          </button>
        </Modal>
      )}

      {/* First Confirmation Modal */}
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
                onClick={handleSecondConfirm}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-lg"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Second Confirmation Modal */}
      {isSecondConfirmModalOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-lg font-bold mb-4">Warning!</h2>
            <p>
              Deleting this product will also delete all associated orders from
              clients. Are you sure you want to proceed?
            </p>
            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setIsSecondConfirmModalOpen(false);
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
            {errorMessage && (
              <div className="bg-red-100 text-red-700 p-2 mb-4 rounded-md">
                {errorMessage}
              </div>
            )}
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
                className={`bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-lg flex items-center ${isLoading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                disabled={isLoading}
              >
                {isLoading && <Spinner className="mr-2" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clients Modal */}
      {isClientsModalOpen && (
        <Modal
          isOpen={isClientsModalOpen}
          onRequestClose={() => setIsClientsModalOpen(false)}
          contentLabel="Clients List"
          className="fixed inset-0 flex justify-center items-center bg-black bg-opacity-75"
          overlayClassName="bg-black bg-opacity-75"
        >
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Clients Who Purchased</h2>
            {selectedProductClients.length > 0 ? (
              <ul className="divide-y divide-gray-200">
                {selectedProductClients.map((client, index) => (
                  <li
                    key={`${client.id}-${index}`}
                    className="py-2 flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">
                        {client.first_name} {client.last_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        Purchased on:{' '}
                        {formatDateSafely(client.purchase_date)}
                      </p>
                      <p className="text-sm text-gray-500">
                        Size: {client.size}
                      </p>
                      <p className="text-sm text-gray-500">
                        Amount: ${client.amount}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/dashboard/clients/${client.client_id}/${client.first_name}-${client.last_name}`)}
                      className="text-blue-500 hover:underline"
                    >
                      View Profile
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No clients have purchased this product yet.</p>
            )}
            <button
              onClick={() => setIsClientsModalOpen(false)}
              className="mt-4 bg-blue-500 hover:bg-blue-600 text-white py-1 px-3 rounded-lg"
            >
              Close
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ProductsTab;
