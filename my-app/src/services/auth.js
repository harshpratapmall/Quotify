import { apiRequest, request, requestJson } from './apiClient';
import { apiUrl } from '../config/api';

export const fetchSession = () => requestJson('/api/v1/auth/me');

export const loginRequest = (credentials) => apiRequest('POST', '/api/v1/auth/login', credentials);

export const logoutRequest = () => request('/api/v1/auth/logout', { method: 'POST' });

export const startGoogleLogin = () => {
  window.location.assign(apiUrl('/api/v1/auth/google/start'));
};