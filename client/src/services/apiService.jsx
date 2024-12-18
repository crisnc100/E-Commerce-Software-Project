// src/services/apiService.js

import axios from 'axios';

const apiService = {
  // Authentication APIs
  systemExists: () => axios.get('http://localhost:5000/api/system_exists', { withCredentials: true }),

  // Register the admin user during the initial system setup
  registerAdmin: (firstName, lastName, email, passcode) =>
    axios.post('http://localhost:5000/api/register_admin', {
      first_name: firstName,
      last_name: lastName,
      email,
      passcode
    }, { withCredentials: true }),

  // Login with email and passcode (first-time login)
  login: (data) =>
    axios.post('http://localhost:5000/api/login', data, { withCredentials: true }),

  // Quick login with passcode only
  quickLogin: (data) =>
    axios.post('http://localhost:5000/api/quick_login', data, { withCredentials: true }),

  // Check if the user is authenticated
  isAuthenticated: () =>
    axios.get('http://localhost:5000/api/is_authenticated', { withCredentials: true }),

  // Logout the user and clear the session
  logout: () =>
    axios.post('http://localhost:5000/api/logout', {}, { withCredentials: true }),
  createProduct: (formData) =>
    axios.post('http://localhost:5000/api/create_product', formData, {
      withCredentials: true,
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
    
  getAllProducts: (page = 1, search = '') => {
    let url = `http://localhost:5000/api/get_all_products/page/${page}`;
    if (search) {
      url += `?search=${encodeURIComponent(search)}`;
    }
    return axios.get(url, {withCredentials: true });
  },
  getClientsForProduct: (productId) =>
    axios.get(`http://localhost:5000/api/get_clients_for_product/${productId}`, { withCredentials: true }

    ),
    updateProduct: (productId, formData) => {
      return axios.put(
        `http://localhost:5000/api/update_product/${productId}`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          withCredentials: true,
        }
      );
    },    
  deleteProduct: (productId) => {
    return axios.delete(`http://localhost:5000/api/delete_product/${productId}`, { withCredentials: true });
  },
  addClient: (formData) =>
    axios.post('http://localhost:5000/api/add_client', formData, { withCredentials: true }

    ),
  allClients: (page = 1, search = '') => {
    let url = `http://localhost:5000/api/all_clients/page/${page}`;
    if (search) {
      url += `?search=${encodeURIComponent(search)}`;
    }
    return axios.get(url, { withCredentials: true });
  },
  updateClient: (clientId, formData) =>
    axios.put(`http://localhost:5000/api/update_client/${clientId}`, formData, { withCredentials: true }

    ),
  deleteClient: (clientId) => {
    return axios.delete(`http://localhost:5000/api/delete_client/${clientId}`, { withCredentials: true });
  },
  getClientById: (clientId) =>
    axios.get(`http://localhost:5000/api/get_one_client/${clientId}`, { withCredentials: true }

    ),
  createPurchase: (formData) =>
    axios.post('http://localhost:5000/api/create_purchase', formData, { withCredentials: true }

    ),
  updatePurchase: (purchaseId, formData) =>
    axios.put(`http://localhost:5000/api/update_purchase/${purchaseId}`, formData, { withCredentials: true }

    ),
  updatePurchaseStatus: (purchaseId, formData) => axios.put(`http://localhost:5000/api/update_purchase_status/${purchaseId}`, formData
    , { withCredentials: true }
    ),
  getPurchasesByClientId: (clientId) =>
    axios.get(`http://localhost:5000/api/get_purchases_by_client/${clientId}`, { withCredentials: true }

    ),
  updatePurchaseShipping: (purchaseId, formData) =>
    axios.put(
      `http://localhost:5000/api/update_shipping_status/${purchaseId}`,
      { shipping_status: formData },
      {
        withCredentials: true,
        headers: { 'Content-Type': 'application/json' }
      }
    ),
    
  getLatePendingDeliveries: () => {
    return axios.get(`http://localhost:5000/api/get_late_pending_deliveries`, { withCredentials: true })
  },
  deletePurchase: (purchaseId) => {
    return axios.delete(`http://localhost:5000/api/delete_purchase/${purchaseId}`, { withCredentials: true });
  },
  getOverduePurchases: () => {
    return axios.get(`http://localhost:5000/api/get_overdue_purchases`, { withCredentials: true })
  },
  getTotalAmountByClientId: (clientId) =>
    axios.get(`http://localhost:5000/api/get_total_amount_by_client/${clientId}`, { withCredentials: true }

    ),
  createPayment: (formData) => axios.post('http://localhost:5000/api/create_payment', formData, { withCredentials: true }

  ),
  getPaymentsByPurchaseId: (purchaseId) => axios.get(`http://localhost:5000/api/get_payments_by_purchase/${purchaseId}`, { withCredentials: true }

  ),
  getPaymentsByClientId: (clientId) => axios.get(`http://localhost:5000/api/get_payments_by_client/${clientId}`, { withCredentials: true }

  ),
  deletePayment: (paymentId) => {
    return axios.delete(`http://localhost:5000/api/delete_payment/${paymentId}`, { withCredentials: true });
  },

  allPurchasesByClientId: (clientId, page = 1) =>
    axios.get(`http://localhost:5000/api/all_purchases_for_client/${clientId}/page/${page}`

    , { withCredentials: true }),
  allPurchasesByProductId: (productId, page = 1) =>
    axios.get(`http://localhost:5000/api/all_purchases_for_product/${productId}/page/${page}`

    , { withCredentials: true }),

  searchProductsByName: (name) => {
    return axios.get(`http://localhost:5000/api/search_products?name=${name}`, { withCredentials: true });
  },
  searchClientsByName: (name) => {
    return axios.get(`http://localhost:5000/api/search_clients?name=${name}`, { withCredentials: true });
  },
  getRecentActivities: (timeSpan) => {
    return axios.get(`http://localhost:5000/api/get_recent_activities?time_span=${timeSpan}`, { withCredentials: true });
  },
  getWeeklyMetrics: () => {
    return axios.get(`http://localhost:5000/api/get_weekly_metrics`, { withCredentials: true })
  },
  getMonthlyMetrics: () => {
    return axios.get(`http://localhost:5000/api/get_monthly_metrics`, { withCredentials: true })
  },
  getSingleMonthMetrics: (year, month) => {
    return axios.get(`http://localhost:5000/api/get_single_month_metrics`, { 
      withCredentials: true,
      params: { year, month }
    });
  },
  getMonthlyMetricsForYear: (year) => {
    return axios.get(`http://localhost:5000/api/get_monthly_metrics_for_year?year=${year}`, { withCredentials: true });
  },
  getYearlyMetrics: (year) => {
    return axios.get(`http://localhost:5000/api/get_yearly_metrics`, { 
      withCredentials: true,
      params: { year }
    });
  },
  getTopProducts: (year, month, category) => {
    return axios.get(`http://localhost:5000/api/get_top_products`, { withCredentials: true,
      params: { year, month, category },
    });
  },



};

export default apiService;
