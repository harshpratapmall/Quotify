import { requestJson } from './apiClient';

export const fetchPublicShare = (token) => requestJson(`/api/v1/public/share/${encodeURIComponent(token)}`);