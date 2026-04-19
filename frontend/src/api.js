import axios from 'axios';

// Create a global Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
});

// Request interceptor: Attach JWT token to every request if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401s (expired token) globally
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If we're getting a 401 Unauthorized, the token might be expired.
    // In a full production app we'd try to use the refresh_token here.
    // For now, if it's 401 and we're not on the login page, log the user out.
    if (error.response?.status === 401) {
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
