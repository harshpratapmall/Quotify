import { requestJson } from './apiClient';

export const listUsers = async () => {
  const { response, data } = await requestJson('/api/v1/admin/users');
  return response.ok && Array.isArray(data) ? data : [];
};

export const createUser = (payload) => requestJson('/api/v1/admin/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

export const updateUserStatus = (id, status) => requestJson(`/api/v1/admin/users/${id}/status`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status }),
});

export const resetUserPassword = (id, password) => requestJson(`/api/v1/admin/users/${id}/reset-password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ password }),
});
