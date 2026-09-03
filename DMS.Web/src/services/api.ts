import axios from 'axios';

export const API_HOST_URL = (import.meta.env.VITE_API_URL || 'https://dms-azie.onrender.com').replace(/\/$/, '');
export const API_BASE_URL = `${API_HOST_URL}/api/v1`;

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dms_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dms_token');
      localStorage.removeItem('dms_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
