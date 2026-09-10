import axios from 'axios';

const getApiHostUrl = (): string => {
  // 1. Explicit VITE_API_URL environment variable override if set
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // 2. Vite Development Mode (npm run dev)
  if (import.meta.env.DEV || import.meta.env.MODE === 'development') {
    return 'http://localhost:5000';
  }

  // 3. Localhost browser hostname check
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000';
  }

  // 4. Default Production Hosted Backend API URL
  return 'https://dms-azie.onrender.com';
};

export const API_HOST_URL = getApiHostUrl().replace(/\/$/, '');
export const API_BASE_URL = `${API_HOST_URL}/api/v1`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dms_token');
  const tenantCode = localStorage.getItem('dms_tenant');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (tenantCode) {
    config.headers['X-Tenant-Code'] = tenantCode;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dms_token');
      localStorage.removeItem('dms_user');
      localStorage.removeItem('dms_tenant');
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
