import { apiList, apiRequest, request, requestJson } from './apiClient';

const pathFor = (type, id = '') => `/api/v1/${type === 'bill' ? 'bills' : 'quotations'}${id ? `/${id}` : ''}`;

export const listDocuments = (type) => apiList(pathFor(type));

export const fetchDocumentById = async (type, id) => {
  const { response, data } = await requestJson(pathFor(type, id));
  return response.ok ? data : null;
};

export const saveDocumentRequest = (type, id, payload) =>
  apiRequest(id ? 'PUT' : 'POST', pathFor(type, id), payload);

export const deleteDocumentRequest = (type, id) => request(pathFor(type, id), { method: 'DELETE' });

export const updateDocumentStatus = (type, id, payload) => apiRequest('PATCH', `${pathFor(type, id)}/status`, payload);

export const createDocumentShare = (type, id) => apiRequest('POST', `${pathFor(type, id)}/share`);

export const convertQuotationToBill = (id) => apiRequest('POST', `/api/v1/quotations/${id}/convert-to-bill`);