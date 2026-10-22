import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: inject Bearer Token from localStorage
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('railfood_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: handle expired session
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired or unauthorized
      if (localStorage.getItem('railfood_token')) {
        console.warn('Session expired or unauthorized. Logging out.');
        localStorage.removeItem('railfood_token');
        localStorage.removeItem('railfood_user');
        window.dispatchEvent(new Event('auth-change'));
      }
    }
    return Promise.reject(error);
  }
);

// Structured API Service Helpers
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
};

export const trainsApi = {
  getTrains: (search) => api.get('/trains/', { params: { search } }),
  getStations: () => api.get('/trains/stations'),
};

export const menuApi = {
  getMenu: (stationId, category) =>
    api.get('/menu/', {
      params: {
        station_id: stationId,
        category: category !== 'ALL' ? category : undefined,
      },
    }),
  addMenuItem: (itemData) => api.post('/menu/', itemData),
};

export const ordersApi = {
  placeOrder: (orderData) => api.post('/orders/', orderData),
  getPassengerOrders: () => api.get('/orders/'),
  getVendorOrders: () => api.get('/orders/vendor'),
  updateStatus: (orderId, status) => api.put(`/orders/${orderId}/status`, { status }),
  getInvoicePdfUrl: (orderId) => `/api/orders/${orderId}/invoice.pdf`,
};

export const documentsApi = {
  getUploadUrl: (filename, contentType = 'image/jpeg', folder = 'menu-photos') =>
    api.post('/documents/upload-url', {
      filename,
      content_type: contentType,
      folder,
    }),
  uploadDirectToS3: (uploadUrl, file, contentType) =>
    axios.put(uploadUrl, file, {
      headers: {
        'Content-Type': contentType,
        'x-amz-server-side-encryption': 'AES256',
      },
    }),
};

export const adminApi = {
  getAnalytics: () => api.get('/admin/analytics'),
};

export default api;
