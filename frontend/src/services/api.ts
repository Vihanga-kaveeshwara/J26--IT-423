import axios from 'axios';

const rawUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const baseApiUrl = rawUrl.replace(/\/v1\/?$/, '');

const api = axios.create({
  baseURL: baseApiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((reqConfig) => {
  const token = localStorage.getItem('ceylon_auth_token');
  if (token && reqConfig.headers) {
    reqConfig.headers.Authorization = `Bearer ${token}`;
  }
  return reqConfig;
});

export default api;
