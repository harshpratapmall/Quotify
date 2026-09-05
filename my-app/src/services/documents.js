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

export const updateDocumentStatus = (type, id, payload) => requestJson(`${pathFor(type, id)}/status`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

export const createDocumentShare = (type, id) => requestJson(`/api/v1/${type === 'bill' ? 'bills' : 'quotations'}/${id}/share`, { method: 'POST' });

export const revokeQuotationShare = (id) => request(`/api/v1/quotations/${id}/share`, { method: 'DELETE' });

export const revokeDocumentShare = (type, id) => request(`/api/v1/${type === 'bill' ? 'bills' : 'quotations'}/${id}/share`, { method: 'DELETE' });

export const convertQuotationToBill = (id) => requestJson(`/api/v1/quotations/${id}/convert-to-bill`, { method: 'POST' });
