// src/services/apiService.js

import axios from 'axios';

const apiService = {
  // Authentication APIs
  checkPasscodeExists: () => axios.get('http://localhost:5000/api/passcode_exists'),
  setPasscode: (email, passcode) => axios.post('http://localhost:5000/api/set_passcode', { email, passcode }),
  verifyPasscode: (passcode) => axios.post('http://localhost:5000/api/verify_passcode', { passcode }, { withCredentials: true }),
  resetPasscode: (email, new_passcode) => axios.post('http://localhost:5000/api/reset_passcode', { email, new_passcode }),
  changePasscode: (current_passcode, new_passcode) => axios.put('http://localhost:5000/api/change_passcode', { current_passcode, new_passcode }),
  logout: () => axios.post('http://localhost:5000/api/logout', {}, { withCredentials: true }),
  isAuthenticated: () => axios.get('http://localhost:5000/api/is_authenticated', { withCredentials: true }),
  createProduct: (formData) =>
    axios.post('http://localhost:5000/api/create_product', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getAllProducts: () => {
    return axios.get('http://localhost:5000/api/get_all_products');
  },
  updateProduct: (productId, formData) => {
    return axios.put(`http://localhost:5000/api/update_product/${productId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  deleteProduct: (productId) => {
    return axios.delete(`http://localhost:5000/api/delete_product/${productId}`);
  },
  addClient: (formData) =>
    axios.post('http://localhost:5000/api/add_client', formData

    ),
  allClients:() => {
    return axios.get('http://localhost:5000/api/all_clients');
  },
  deleteClient: (clientId) => {
    return axios.delete(`http://localhost:5000/api/delete_client/${clientId}`);
  },

};

export default apiService;
