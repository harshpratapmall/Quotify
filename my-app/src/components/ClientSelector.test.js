import { fireEvent, render, screen } from '@testing-library/react';
import ClientSelector from './ClientSelector';
import { listClients } from '../services/clients';

jest.mock('../services/clients', () => ({ listClients: jest.fn() }));

test('selects full client details, excludes archived clients, and allows unlinking', async () => {
  const client = { id: 'c1', name: 'Customer', phone: '123', email: 'client@example.com', address: 'Site', status: 'active' };
  listClients.mockResolvedValue({ response: { ok: true }, data: [client, { id: 'c2', name: 'Archived', status: 'archived' }] });
  const onSelect = jest.fn();
  render(<ClientSelector onSelect={onSelect} />);
  await screen.findByRole('option', { name: /Customer/ });
  expect(screen.queryByRole('option', { name: /Archived/ })).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('combobox'), { target: { value: 'c1' } });
  expect(onSelect).toHaveBeenLastCalledWith(client);
  fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
  expect(onSelect).toHaveBeenLastCalledWith(null);
});

test('keeps an existing link when the client directory fails to load', async () => {
  listClients.mockRejectedValue(new Error('offline'));
  render(<ClientSelector clientId="existing" onSelect={jest.fn()} />);
  await screen.findByText(/Unable to load clients/);
  expect(screen.getByRole('combobox')).toHaveValue('existing');
});
