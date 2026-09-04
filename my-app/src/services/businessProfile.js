import { requestJson } from './apiClient';
export const fetchBusinessProfile = () => requestJson('/api/v1/business-profile');
export const saveBusinessProfile = (profile) => requestJson('/api/v1/business-profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) });
