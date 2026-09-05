import { requestJson } from './apiClient';

const clientPath = (id = '') => `/api/v1/clients${id ? `/${id}` : ''}`;

export const listClients = (query = '') => requestJson(`${clientPath()}${query ? `?q=${encodeURIComponent(query)}` : ''}`);

export const createClient = (client) => requestJson(clientPath(), {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(client),
});

export const updateClient = (id, client) => requestJson(clientPath(id), {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(client),
});

export const updateClientStatus = (id, status) => requestJson(`${clientPath(id)}/status?status=${encodeURIComponent(status)}`, {
  method: 'PATCH',
});