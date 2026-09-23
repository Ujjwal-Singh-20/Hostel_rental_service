import axios from 'axios';

export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/+$/, '');
  }
  // When accessed from a phone or other device on local LAN (e.g. http://10.21.35.244:5173),
  // automatically point API to the host device IP on port 8000
  if (typeof window !== 'undefined' && window.location.hostname && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && window.location.hostname !== '0.0.0.0') {
    return `http://${window.location.hostname}:8000`;
  }
  return (envUrl || 'http://localhost:8000').replace(/\/+$/, '');
}

export const API_BASE_URL = getApiBaseUrl();

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('hostelshare_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token expired or invalid
      // Do not hard wipe if checking optional endpoints
    }
    return Promise.reject(error);
  }
);

// Helper to format image URLs
export function resolveImageUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

export const api = {
  // Auth
  sendOtp: (phoneNumber) => apiClient.post('/auth/send-otp', { phone_number: phoneNumber }),
  verifyOtp: (phoneNumber, otpCode) => apiClient.post('/auth/verify-otp', { phone_number: phoneNumber, otp_code: otpCode }),
  
  // Users & Profiles
  getMe: () => apiClient.get('/users/me'),
  onboardUser: (data) => apiClient.post('/users/onboard', data),
  updateProfile: (data) => apiClient.put('/users/me', data),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/users/upload-avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getPublicProfile: (username) => apiClient.get(`/u/${username}`),

  // Items
  getFeedItems: (params) => apiClient.get('/items', { params }),
  getItemDetail: (id) => apiClient.get(`/items/${id}`),
  createItem: (data) => apiClient.post('/items', data),
  uploadItemImage: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/items/upload-image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  deleteItem: (id) => apiClient.delete(`/items/${id}`),

  // Rental Lifecycle & Dual Handshake
  requestRental: (data) => apiClient.post('/rentals/request', data),
  getMyRentals: () => apiClient.get('/rentals/my-rentals'),
  getRental: (id) => apiClient.get(`/rentals/${id}`),
  acceptRental: (id) => apiClient.post(`/rentals/${id}/accept`),
  verifyHandover: (id, pin) => apiClient.post(`/rentals/${id}/verify-handover`, { pin }),
  verifyReturn: (id, pin) => apiClient.post(`/rentals/${id}/verify-return`, { pin }),
  cancelRental: (id) => apiClient.post(`/rentals/${id}/cancel`),
  submitReview: (id, data) => apiClient.post(`/rentals/${id}/review`, data),

  // Chat & Mutual Phone Reveal
  getChat: (rentalId) => apiClient.get(`/chat/${rentalId}`),
  sendMessage: (rentalId, content) => apiClient.post(`/chat/${rentalId}/messages`, { content }),
  toggleSharePhone: (rentalId) => apiClient.post(`/chat/${rentalId}/share-phone`),
};

export default api;
