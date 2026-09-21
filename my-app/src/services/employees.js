import { apiRequest, requestJson } from './apiClient';

const employeePath = (id = '') => `/api/v1/employees${id ? `/${id}` : ''}`;

export const listEmployees = (query = '') => requestJson(`${employeePath()}${query ? `?q=${encodeURIComponent(query)}` : ''}`);

export const createEmployee = (employee) => apiRequest('POST', employeePath(), employee);

export const updateEmployee = (id, employee) => apiRequest('PUT', employeePath(id), employee);

export const deleteEmployee = (id) => apiRequest('DELETE', employeePath(id));

export const fetchPayrollOverview = (period) => requestJson(`/api/v1/employees/payroll?period=${encodeURIComponent(period)}`);
export const fetchPayrollRegister = (period) => requestJson(`/api/v1/employees/payroll/register?period=${encodeURIComponent(period)}`);
export const fetchEmployeePayroll = (id) => requestJson(`${employeePath(id)}/payroll`);
export const saveEmployeePayroll = (id, payroll) => apiRequest('POST', `${employeePath(id)}/payroll`, payroll);
export const createPayrollEntry = (id, entry) => apiRequest('POST', `${employeePath(id)}/payroll/entries`, entry);
export const updatePayrollEntry = (id, entryId, entry) => apiRequest('PUT', `${employeePath(id)}/payroll/entries/${entryId}`, entry);
export const deletePayrollEntry = (id, entryId) => apiRequest('DELETE', `${employeePath(id)}/payroll/entries/${entryId}`);
export const finalizePayroll = (id, period) => apiRequest('POST', `${employeePath(id)}/payroll/${encodeURIComponent(period)}/finalize`);
export const reopenPayroll = (id, period) => apiRequest('POST', `${employeePath(id)}/payroll/${encodeURIComponent(period)}/reopen`);
export const fetchPayslip = (id, period) => requestJson(`${employeePath(id)}/payroll/${encodeURIComponent(period)}/payslip`);
