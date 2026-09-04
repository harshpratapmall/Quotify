import { request, requestJson } from './apiClient';

const pathFor = (type, id = '') => `/api/v1/${type === 'bill' ? 'bills' : 'quotations'}${id ? `/${id}` : ''}`;

export const listDocuments = async (type) => {
  const { response, data } = await requestJson(pathFor(type));
  return response.ok && Array.isArray(data) ? data : [];
};

export const fetchDocumentById = async (type, id) => {
  const { response, data } = await requestJson(pathFor(type, id));
  return response.ok ? data : null;
};

export const saveDocumentRequest = async (type, id, payload) => {
  const { response, data } = await requestJson(pathFor(type, id), {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return { response, data };
};

export const deleteDocumentRequest = (type, id) => request(pathFor(type, id), { method: 'DELETE' });
