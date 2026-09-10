import { apiRequest, requestJson } from './apiClient';

const clientPath = (id = '') => `/api/v1/clients${id ? `/${id}` : ''}`;
export const listClientDocuments = (id) => requestJson(`${clientPath(id)}/documents`);

export const listClients = (query = '') => requestJson(`${clientPath()}${query ? `?q=${encodeURIComponent(query)}` : ''}`);

export const createClient = (client) => apiRequest('POST', clientPath(), client);

export const updateClient = (id, client) => apiRequest('PUT', clientPath(id), client);

export const deleteClient = (id) => apiRequest('DELETE', clientPath(id));