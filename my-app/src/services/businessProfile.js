import { apiRequest, requestJson } from './apiClient';

export const fetchBusinessProfile = () => requestJson('/api/v1/business-profile');

export const saveBusinessProfile = (profile) => apiRequest('PUT', '/api/v1/business-profile', profile);