import { render, screen } from '@testing-library/react';
import Employees from './Employees';
import { deleteEmployee, listEmployees } from '../services/employees';

jest.mock('../services/employees', () => ({
  listEmployees: jest.fn(),
  createEmployee: jest.fn(),
  updateEmployee: jest.fn(),
  deleteEmployee: jest.fn(),
}));

test('loads and renders the employee directory', async () => {
  listEmployees.mockResolvedValue({ response: { ok: true }, data: [{ id: 'EM-1', name: 'Ravi', phone: '9876543210', email: '', address: 'Pune', designation: 'Carpenter', notes: '' }] });

  render(<Employees navigate={jest.fn()} />);

  expect(screen.getByRole('heading', { name: /employees/i })).toBeTruthy();
  expect(await screen.findByText('Ravi')).toBeTruthy();
  expect(screen.getByText('Carpenter')).toBeTruthy();
  expect(screen.getByText('9876543210')).toBeTruthy();
});

test('deletes an employee from the directory', async () => {
  listEmployees.mockResolvedValue({ response: { ok: true }, data: [{ id: 'EM-2', name: 'Sunil', designation: 'Painter' }] });
  deleteEmployee.mockResolvedValue({ response: { ok: true } });
  window.confirm = jest.fn(() => true);

  render(<Employees navigate={jest.fn()} />);

  (await screen.findByRole('button', { name: 'Delete Sunil' })).click();
  expect(deleteEmployee).toHaveBeenCalledWith('EM-2');
});