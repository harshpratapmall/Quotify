import { apiRequest, requestJson } from './apiClient';

const employeePath = (id = '') => `/api/v1/employees${id ? `/${id}` : ''}`;

export const listEmployees = (query = '') => requestJson(`${employeePath()}${query ? `?q=${encodeURIComponent(query)}` : ''}`);

export const createEmployee = (employee) => apiRequest('POST', employeePath(), employee);

export const updateEmployee = (id, employee) => apiRequest('PUT', employeePath(id), employee);

export const deleteEmployee = (id) => apiRequest('DELETE', employeePath(id));