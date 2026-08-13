/**
 * Axios instance — base URL and request/response interceptors.
 *
 * The request interceptor attaches the access token from localStorage.
 * The response interceptor handles 401 responses by attempting a single
 * token refresh; if the refresh also fails the user is redirected to /login.
 */

import axios from 'axios';

const rawUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/+$/, '');
const BASE_URL = rawUrl.endsWith('/api') ? rawUrl : `${rawUrl}/api`;

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  timeout: 15_000,
});

// ── Request interceptor — attach access token ─────────────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor — refresh on 401 ────────────────────────────────
let isRefreshing = false;
let pendingRequests = [];

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt a refresh for 401s that haven't been retried and aren't
    // the refresh call itself (to avoid infinite loops).
    if (
      error.response?.status === 401 &&
      error.response?.data?.code === 'TOKEN_EXPIRED' &&
      !original._retried &&
      original.url !== '/auth/refresh'
    ) {
      original._retried = true;

      if (isRefreshing) {
        // Queue the request until the ongoing refresh finishes.
        return new Promise((resolve, reject) => {
          pendingRequests.push({ resolve, reject });
        }).then(() => api(original));
      }

      isRefreshing = true;
      const refreshToken = localStorage.getItem('refreshToken');

      try {
        const { data } = await api.post('/auth/refresh', { refreshToken });
        localStorage.setItem('accessToken', data.data.accessToken);
        localStorage.setItem('refreshToken', data.data.refreshToken);

        pendingRequests.forEach(({ resolve }) => resolve());
        pendingRequests = [];
        isRefreshing = false;

        return api(original);
      } catch {
        pendingRequests.forEach(({ reject }) => reject(error));
        pendingRequests = [];
        isRefreshing = false;

        // Refresh failed — clear tokens and redirect to login.
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
