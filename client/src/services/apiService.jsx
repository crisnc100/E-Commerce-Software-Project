// src/services/apiService.js

import axios from 'axios';
import API_BASE_URL from './config';


const apiService = {
  // Authentication APIs
  systemExists: () => axios.get(`${API_BASE_URL}/api/system_exists`, { withCredentials: true }),

  // Register the admin user during the initial system setup
  // apiService.js
  getSystemInfo: () => axios.get(`${API_BASE_URL}/api/get_system_info`, { withCredentials: true }),
  registerAdmin: (data) =>
    axios.post(`${API_BASE_URL}/api/register_admin`, data, {
      withCredentials: true
    }),


  validateSystemName: (data) =>
    axios.post(`${API_BASE_URL}/api/validate_system_name`, data, {
      withCredentials: true
    }),
  deleteSystem: (systemId, userId) => {
    axios.delete(`${API_BASE_URL}/api/delete_system/${systemId}/${userId}`, { withCredentials: true });
  },

  addUserWithTempPass: (firstName, lastName, email, role) =>
    axios.post(`${API_BASE_URL}/api/add_user_manually`, {
      first_name: firstName,
      last_name: lastName,
      email: email,
      role: role
    }, { withCredentials: true }),

  // Login with email and passcode (first-time login)
  login: (data) =>
    axios.post(`${API_BASE_URL}/api/login`, data, { withCredentials: true }),
  getUser: () =>
    axios.get(`${API_BASE_URL}/api/get_user`, { withCredentials: true }

    ),
  getUsersBySystem: () =>
    axios.get(`${API_BASE_URL}/api/get_users_by_system`, { withCredentials: true }

    ),
  deleteUserSelf: (userId) => {
    axios.delete(`${API_BASE_URL}/api/delete_user_self/${userId}`, { withCredentials: true });
  },
  deleteUserByAdmin: (userId) => {
    axios.delete(`${API_BASE_URL}/api/delete_user_by_admin/${userId}`, { withCredentials: true });
  },
  updatePaypalCredentials: (data) =>
    axios.put(`${API_BASE_URL}/api/update_paypal_credentials`, data, {
      withCredentials: true,
    }),

  updateTempPasscode: (newPasscode) =>
    axios.post(
      `${API_BASE_URL}/api/update_temp_password`,
      { new_password: newPasscode },
      { withCredentials: true }
    ),
  resendTempPassword: (userId) =>
    axios.post(
      `${API_BASE_URL}/api/resend_temp_password`,
      { user_id: userId },
      { withCredentials: true }
    ),
  updateUserInfo: (data) =>
    axios.put(`${API_BASE_URL}/api/update_user_info`, data, {
      withCredentials: true,
    }),

  updateUserPassword: (currentPassword, newPassword, confirmPassword) =>
    axios.put(
      `${API_BASE_URL}/api/update_user_password`,
      { current_password: currentPassword, new_password: newPassword, confirm_password: confirmPassword },
      { withCredentials: true }
    ),

  // Quick login with passcode only
  quickLogin: (data) =>
    axios.post(`${API_BASE_URL}/api/quick_login`, data, { withCredentials: true }),

  // Check if the user is authenticated
  isAuthenticated: () =>
    axios.get(`${API_BASE_URL}/api/is_authenticated`, { withCredentials: true }),

  // Logout the user and clear the session
  logout: () =>
    axios.post(`${API_BASE_URL}/api/logout`, {}, { withCredentials: true }),
  forgotPassword: (email) =>
    axios.post(
      `${API_BASE_URL}/api/forgot_password`,
      { email },
      { withCredentials: true }
    ),

  createProduct: (formData) =>
    axios.post(`${API_BASE_URL}/api/create_product`, formData, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getAllProducts: (page = 1, search = '') => {
    let url = `${API_BASE_URL}/api/get_all_products/page/${page}`;
    if (search) {
      url += `?search=${encodeURIComponent(search)}`;
    }
    return axios.get(url, { withCredentials: true });
  },
  getClientsForProduct: (productId) =>
    axios.get(`${API_BASE_URL}/api/get_clients_for_product/${productId}`, { withCredentials: true }

    ),
  updateProduct: (productId, formData) => {
    return axios.put(
      `${API_BASE_URL}/api/update_product/${productId}`,
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        withCredentials: true,
      }
    );
  },
  deleteProduct: (productId) => {
    return axios.delete(`${API_BASE_URL}/api/delete_product/${productId}`, { withCredentials: true });
  },
  addClient: (formData) =>
    axios.post(`${API_BASE_URL}/api/add_client`, formData, { withCredentials: true }

    ),
  allClients: (page = 1, search = '') => {
    let url = `${API_BASE_URL}/api/all_clients/page/${page}`;
    if (search) {
      url += `?search=${encodeURIComponent(search)}`;
    }
    return axios.get(url, { withCredentials: true });
  },
  updateClient: (clientId, formData) =>
    axios.put(`${API_BASE_URL}/api/update_client/${clientId}`, formData, { withCredentials: true }

    ),
  deleteClient: (clientId) => {
    return axios.delete(`${API_BASE_URL}/api/delete_client/${clientId}`, { withCredentials: true });
  },
  getClientById: (clientId) =>
    axios.get(`${API_BASE_URL}/api/get_one_client/${clientId}`, { withCredentials: true }

    ),
  createPurchase: (formData) =>
    axios.post(`${API_BASE_URL}/api/create_purchase`, formData, { withCredentials: true }

    ),
  addItemToOrder: (formData) =>
    axios.post(`${API_BASE_URL}/api/add_purchase_item`, formData, { withCredentials: true }
    ),
  generatePayPalLink: (data) =>
    axios.post(`${API_BASE_URL}/api/generate_paypal_link`, data, {
      withCredentials: true,
    }),

  regeneratePayPalLink: (purchaseId) =>
    axios.post(
      `${API_BASE_URL}/api/regenerate_paypal_link/${purchaseId}`, null, {
      withCredentials: true,
    }),
  getPayPalLink: (purchaseId) =>
    axios.get(`${API_BASE_URL}/api/get_paypal_link/${purchaseId}`, {
      withCredentials: true,
    }),
  updatePurchase: (purchaseId, formData) =>
    axios.put(`${API_BASE_URL}/api/update_purchase/${purchaseId}`, formData, { withCredentials: true }

    ),
  updatePurchaseItem: (itemId, formData) =>
    axios.put(`${API_BASE_URL}/api/update_purchase_item/${itemId}`, formData, { withCredentials: true }
    ),
  updatePurchaseStatus: (purchaseId, formData) => axios.put(`${API_BASE_URL}/api/update_purchase_status/${purchaseId}`, formData
    , { withCredentials: true }
  ),
  getPurchasesByClientId: (clientId) =>
    axios.get(`${API_BASE_URL}/api/get_purchases_by_client/${clientId}`, { withCredentials: true }

    ),
  updatePurchaseShipping: (purchaseId, formData) =>
    axios.put(
      `${API_BASE_URL}/api/update_shipping_status/${purchaseId}`,
      { shipping_status: formData },
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      }
    ),

  getLatePendingDeliveries: () => {
    return axios.get(`${API_BASE_URL}/api/get_late_pending_deliveries`, { withCredentials: true })
  },
  deletePurchase: (purchaseId) => {
    return axios.delete(`${API_BASE_URL}/api/delete_purchase/${purchaseId}`, { withCredentials: true });
  },
  deletePurchaseItem: (itemId) => {
    return axios.delete(`${API_BASE_URL}/api/delete_purchase_item/${itemId}`, { withCredentials: true });
  },
  getOverduePurchases: () => {
    return axios.get(`${API_BASE_URL}/api/get_overdue_purchases`, { withCredentials: true })
  },
  getTotalAmountByClientId: (clientId) =>
    axios.get(`${API_BASE_URL}/api/get_total_amount_by_client/${clientId}`, { withCredentials: true }

    ),
  createPayment: (formData) => axios.post(`${API_BASE_URL}/api/create_payment`, formData, { withCredentials: true }

  ),
  updatePayment: (paymentId, formData) =>
    axios.put(`${API_BASE_URL}/api/update_payment/${paymentId}`, formData, { withCredentials: true }
    ),
  getPaymentsByPurchaseId: (purchaseId) => axios.get(`${API_BASE_URL}/api/get_payments_by_purchase/${purchaseId}`, { withCredentials: true }

  ),
  getPaymentsByClientId: (clientId) => axios.get(`${API_BASE_URL}/api/get_payments_by_client/${clientId}`, { withCredentials: true }

  ),
  getPaginatedPayments: (page = 1, limit = 12, method = 'PayPal') => {
    return axios.get(`${API_BASE_URL}/api/get_paginated_payments`, {
      params: { page, limit, method },
      withCredentials: true,
    });
  },
  deletePayment: (paymentId) => {
    return axios.delete(`${API_BASE_URL}/api/delete_payment/${paymentId}`, { withCredentials: true });
  },

  allPurchasesByClientId: (clientId, page = 1) =>
    axios.get(`${API_BASE_URL}/api/all_purchases_for_client/${clientId}/page/${page}`

      , { withCredentials: true }),
  allPurchasesByProductId: (productId, page = 1) =>
    axios.get(`${API_BASE_URL}/api/all_purchases_for_product/${productId}/page/${page}`

      , { withCredentials: true }),

  searchProductsByName: (name) => {
    return axios.get(`${API_BASE_URL}/api/search_products?name=${name}`, { withCredentials: true });
  },
  searchClientsByName: (name) => {
    return axios.get(`${API_BASE_URL}/api/search_clients?name=${name}`, { withCredentials: true });
  },
  getRecentActivities: (timeSpan) => {
    return axios.get(`${API_BASE_URL}/api/get_recent_activities?time_span=${timeSpan}`, { withCredentials: true });
  },
  getWeeklyMetrics: () => {
    return axios.get(`${API_BASE_URL}/api/get_weekly_metrics`, { withCredentials: true })
  },
  getMonthlyMetrics: () => {
    return axios.get(`${API_BASE_URL}/api/get_monthly_metrics`, { withCredentials: true })
  },
  getSingleMonthMetrics: (year, month) => {
    return axios.get(`${API_BASE_URL}/api/get_single_month_metrics`, {
      withCredentials: true,
      params: { year, month }
    });
  },
  getMonthlyMetricsForYear: (year) => {
    return axios.get(`${API_BASE_URL}/api/get_monthly_metrics_for_year?year=${year}`, { withCredentials: true });
  },
  getYearlyMetrics: (year) => {
    return axios.get(`${API_BASE_URL}/api/get_yearly_metrics`, {
      withCredentials: true,
      params: { year }
    });
  },
  getTopProducts: (year, month, category) => {
    return axios.get(`${API_BASE_URL}/api/get_top_products`, {
      withCredentials: true,
      params: { year, month, category },
    });
  },



};

export default apiService;
