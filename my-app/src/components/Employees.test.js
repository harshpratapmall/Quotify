import { render, screen } from '@testing-library/react';
import Employees from './Employees';
import { deleteEmployee, fetchPayrollOverview, fetchPayrollRegister, listEmployees } from '../services/employees';
import { APP_ROUTES } from '../config/routes';

jest.mock('../services/employees', () => ({
  listEmployees: jest.fn(),
  createEmployee: jest.fn(),
  updateEmployee: jest.fn(),
  deleteEmployee: jest.fn(),
  fetchPayrollOverview: jest.fn(() => Promise.resolve({ response: { ok: true }, data: {} })),
  fetchPayrollRegister: jest.fn(() => Promise.resolve({ response: { ok: true }, data: { employees: [] } })),
}));

const activeEmployee = { id: 'EM-1', name: 'Ravi', phone: '9876543210', email: '', address: 'Pune', designation: 'Carpenter', notes: '', status: 'active' };
const inactiveEmployee = { id: 'EM-2', name: 'Sunil', phone: '', email: 'sunil@example.com', address: '', designation: 'Painter', notes: '', status: 'inactive' };

beforeEach(() => {
  fetchPayrollOverview.mockResolvedValue({ response: { ok: true }, data: {} });
  fetchPayrollRegister.mockResolvedValue({ response: { ok: true }, data: { employees: [] } });
});

test('loads and renders the employee directory', async () => {
  listEmployees.mockResolvedValue({ response: { ok: true }, data: [activeEmployee] });

  render(<Employees navigate={jest.fn()} pathname={APP_ROUTES.employees} />);

  expect(screen.getByRole('heading', { name: /employees/i })).toBeTruthy();
  expect(await screen.findByText('Ravi')).toBeTruthy();
  expect(screen.getByText('Carpenter')).toBeTruthy();
  expect(screen.getByText('9876543210')).toBeTruthy();
});

test('deletes an employee from the directory', async () => {
  listEmployees.mockResolvedValue({ response: { ok: true }, data: [{ ...activeEmployee, id: 'EM-2', name: 'Sunil' }] });
  deleteEmployee.mockResolvedValue({ response: { ok: true } });
  window.confirm = jest.fn(() => true);

  render(<Employees navigate={jest.fn()} pathname={APP_ROUTES.employees} />);

  (await screen.findByRole('button', { name: 'Delete Sunil' })).click();
  expect(deleteEmployee).toHaveBeenCalledWith('EM-2');
});

test('hides inactive employees by default and shows them on toggle', async () => {
  listEmployees.mockResolvedValue({ response: { ok: true }, data: [activeEmployee, inactiveEmployee] });

  render(<Employees navigate={jest.fn()} pathname={APP_ROUTES.employees} />);

  expect(await screen.findByText('Ravi')).toBeTruthy();
  expect(screen.queryByText('Sunil')).toBeNull();

  screen.getByLabelText(/include inactive/i).click();
  expect(screen.getByText('Sunil')).toBeTruthy();
});

test('shows WhatsApp and call shortcuts when a phone is present', async () => {
  listEmployees.mockResolvedValue({ response: { ok: true }, data: [activeEmployee] });

  render(<Employees navigate={jest.fn()} pathname={APP_ROUTES.employees} />);

  expect(await screen.findByRole('link', { name: 'WhatsApp Ravi' })).toHaveAttribute('href', 'https://wa.me/919876543210?text=Hello%2C%20Ravi.');
  expect(screen.getByRole('link', { name: 'Call Ravi' })).toHaveAttribute('href', 'tel:+919876543210');
  expect(screen.queryByRole('link', { name: /email ravi/i })).toBeNull();
});

test('shows no contact shortcuts without a phone', async () => {
  listEmployees.mockResolvedValue({ response: { ok: true }, data: [inactiveEmployee] });

  render(<Employees navigate={jest.fn()} pathname={APP_ROUTES.employees} />);

  screen.getByLabelText(/include inactive/i).click();
  expect(await screen.findByText('Sunil')).toBeTruthy();
  expect(screen.queryByRole('link', { name: /whatsapp sunil/i })).toBeNull();
  expect(screen.queryByRole('link', { name: /call sunil/i })).toBeNull();
});
