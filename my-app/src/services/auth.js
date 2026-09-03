import { request, requestJson } from './apiClient';

export const fetchSession = () => requestJson('/api/v1/auth/me');

export const loginRequest = ({ username, password }) =>
  requestJson('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

export const logoutRequest = () =>
  request('/api/v1/auth/logout', {
    method: 'POST',
  });
