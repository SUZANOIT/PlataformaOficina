import axios from 'axios';
import type { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { authStorage } from '../utils/auth';

// Custom window event for auth expiration
export const AUTH_EXPIRED_EVENT = 'auth:expired';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request Interceptor: Auto-attach token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Detect expired/invalid sessions globally
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    const status = error.response?.status;
    const errorData = error.response?.data as { error?: string; message?: string } | undefined;
    
    // Extracted error messages
    const errorMessage = errorData?.error || errorData?.message || '';
    
    // Sessions check
    const isUnauthorized = status === 401;
    const hasInvalidTokenMsg = 
      errorMessage.toLowerCase().includes('token not provided') ||
      errorMessage.toLowerCase().includes('invalid token') ||
      errorMessage.toLowerCase().includes('jwt expired') ||
      errorMessage.toLowerCase().includes('token expirado') ||
      errorMessage.toLowerCase().includes('sessão expirada');

    if (isUnauthorized || hasInvalidTokenMsg) {
      // Dispatches the global session expired event
      window.dispatchEvent(new CustomEvent(AUTH_EXPIRED_EVENT, { 
        detail: { reason: errorMessage || 'Sua sessão expirou.' } 
      }));
    }

    return Promise.reject(error);
  }
);
