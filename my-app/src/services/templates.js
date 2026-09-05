import { request, requestJson } from './apiClient';

const templatePath = (id = '') => `/api/v1/templates${id ? `/${id}` : ''}`;

export const listTemplates = () => requestJson(templatePath());
export const createTemplate = (template) => requestJson(templatePath(), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(template) });
export const updateTemplate = (id, template) => requestJson(templatePath(id), { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(template) });
export const deleteTemplate = (id) => request(templatePath(id), { method: 'DELETE' });