import { request, requestJson } from './apiClient';

export const listQuotations = async () => {
  const { response, data } = await requestJson('/api/v1/quotations');
  return response.ok && Array.isArray(data) ? data : [];
};

export const fetchQuotationById = async (id) => {
  const { response, data } = await requestJson(`/api/v1/quotations/${id}`);
  return response.ok ? data : null;
};

export const saveQuotationRequest = async (id, payload) => {
  const { response, data } = await requestJson(id ? `/api/v1/quotations/${id}` : '/api/v1/quotations', {
    method: id ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return { response, data };
};

export const deleteQuotationRequest = (id) =>
  request(`/api/v1/quotations/${id}`, {
    method: 'DELETE',
  });
