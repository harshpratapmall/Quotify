import { render, screen } from '@testing-library/react';
import PublicShare from './PublicShare';
import { fetchPublicShare } from '../services/shares';

jest.mock('../services/shares', () => ({
  fetchPublicShare: jest.fn(),
}));

const share = {
  documentType: 'bill',
  clientName: 'Amit',
  projectName: 'Modular Kitchen',
  email: 'amit@example.com',
  siteLocation: 'Pune',
  date: '2026-09-06',
  scopeOfWork: 'Fitting works',
  includeGst: false,
  gstRate: '18',
  subtotal: 10000,
  tax: 0,
  total: 10000,
  business: {},
  username: 'test-user',
  payload: { items: [] },
};

test('renders Received and Pending for a partially paid bill share', async () => {
  fetchPublicShare.mockResolvedValue({ response: { ok: true }, data: { ...share, paymentStatus: 'partially_paid', payments: '[{"date":"2026-09-01","amount":5000}]' } });

  render(<PublicShare token="abc" />);

  expect(await screen.findAllByText('₹ 5,000')).toHaveLength(2);
  expect(screen.getAllByText('₹ 10,000').length).toBeGreaterThan(0);
  expect(screen.getByText(/Received/)).toBeTruthy();
  expect(screen.getByText(/Pending/)).toBeTruthy();
});

test('omits payment summary when the bill share is not partially paid', async () => {
  fetchPublicShare.mockResolvedValue({ response: { ok: true }, data: { ...share, paymentStatus: 'paid', payments: '[{"date":"2026-09-01","amount":10000}]' } });

  render(<PublicShare token="def" />);

  expect((await screen.findAllByText('₹ 10,000')).length).toBeGreaterThan(0);
  expect(screen.queryByText(/Received/)).toBeNull();
  expect(screen.queryByText(/Pending/)).toBeNull();
});