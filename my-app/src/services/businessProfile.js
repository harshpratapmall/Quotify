import { request, requestJson } from './apiClient';
export const fetchBusinessProfile = () => requestJson('/api/v1/business-profile');
export const saveBusinessProfile = (profile) => requestJson('/api/v1/business-profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(profile) });
export const uploadBusinessLogo = async (file) => { const body = new FormData(); body.append('logo', file); const response = await request('/api/v1/business-profile/logo', { method: 'POST', body }); const data = await response.json(); return { response, data }; };
