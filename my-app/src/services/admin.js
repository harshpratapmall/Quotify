import { apiList, apiRequest } from './apiClient';

export const listUsers = () => apiList('/api/v1/admin/users');

export const createUser = (payload) => apiRequest('POST', '/api/v1/admin/users', payload);

export const updateUserStatus = (id, status) => apiRequest('PATCH', `/api/v1/admin/users/${id}/status`, { status });

export const resetUserPassword = (id, password) => apiRequest('POST', `/api/v1/admin/users/${id}/reset-password`, { password });