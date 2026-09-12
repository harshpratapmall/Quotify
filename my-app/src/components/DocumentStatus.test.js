import { fireEvent, render, screen, within } from '@testing-library/react';
import DocumentStatus from './DocumentStatus';

test('quotation decisions send lifecycle status changes', () => {
  const onChange = jest.fn();
  render(<DocumentStatus type="quotation" document={{ status: 'sent' }} onChange={onChange} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'quotation status' }), { target: { value: 'accepted' } });
  expect(onChange).toHaveBeenCalledWith({ status: 'accepted' });
  expect(screen.getByRole('combobox', { name: 'Payment status' })).toBeInTheDocument();
});

test('quotation payment status changes stay separate from lifecycle status', () => {
  const onChange = jest.fn();
  render(<DocumentStatus type="quotation" document={{ status: 'accepted' }} onChange={onChange} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Payment status' }), { target: { value: 'partially_paid' } });
  expect(onChange).toHaveBeenCalledWith({ paymentStatus: 'partially_paid' });
  expect(screen.getByRole('combobox', { name: 'quotation status' })).toHaveValue('accepted');
});

test('quotation payments can be recorded and removed for partially paid quotations', () => {
  const onChange = jest.fn();
  render(<DocumentStatus type="quotation" document={{ status: 'accepted', paymentStatus: 'partially_paid', total: 10000, payments: [{ date: '2026-09-01', amount: 5000 }] }} onChange={onChange} />);
  const section = screen.getByText('Payments recorded (1)').closest('.payments-section');
  expect(section).not.toBeNull();
  expect(section.textContent).toContain('₹ 5,000');

  fireEvent.change(screen.getByLabelText('Payment date'), { target: { value: '2026-09-05' } });
  fireEvent.change(screen.getByLabelText('Payment amount'), { target: { value: '2500' } });
  fireEvent.click(screen.getByText('Add payment'));
  expect(onChange).toHaveBeenLastCalledWith({ payments: [{ date: '2026-09-01', amount: 5000 }, { date: '2026-09-05', amount: 2500 }] });
});

test('partially paid quotations show total, received, and pending amounts', () => {
  render(<DocumentStatus type="quotation" document={{ status: 'accepted', paymentStatus: 'partially_paid', total: 10000, payments: [{ date: '2026-09-01', amount: 3000 }, { date: '2026-09-05', amount: 2000 }] }} onChange={jest.fn()} />);
  const summary = screen.getByText('Total').closest('.payment-summary');
  expect(summary.textContent).toContain('₹ 10,000');
  expect(summary.textContent).toContain('₹ 5,000');
  expect(screen.getByText('Pending').closest('.payment-summary-pending').textContent).toContain('₹ 5,000');
});

test('quotations without partial payment do not show the payments section', () => {
  const { rerender } = render(<DocumentStatus type="quotation" document={{ status: 'accepted', paymentStatus: 'unpaid', total: 10000, payments: [] }} onChange={jest.fn()} />);
  expect(screen.queryByText(/Payments recorded/)).not.toBeInTheDocument();
  expect(screen.queryByText('Total')).not.toBeInTheDocument();
  rerender(<DocumentStatus type="quotation" document={{ status: 'accepted', paymentStatus: 'paid', total: 10000, payments: [{ date: '2026-09-01', amount: 10000 }] }} onChange={jest.fn()} />);
  expect(screen.queryByText(/Payments recorded/)).not.toBeInTheDocument();
});

test('cancelled quotations hide the payment section', () => {
  render(<DocumentStatus type="quotation" document={{ status: 'cancelled', paymentStatus: 'partially_paid', payments: [{ date: '2026-09-01', amount: 2500 }] }} onChange={jest.fn()} />);
  expect(screen.queryByRole('combobox', { name: 'Payment status' })).not.toBeInTheDocument();
  expect(screen.queryByText(/Payments recorded/)).not.toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'quotation status' })).toHaveValue('cancelled');
});

test('bill payment updates remain separate from lifecycle status and disable while saving', () => {
  const onChange = jest.fn();
  const { rerender } = render(<DocumentStatus type="bill" document={{ status: 'issued' }} onChange={onChange} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Payment status' }), { target: { value: 'partially_paid' } });
  expect(onChange).toHaveBeenCalledWith({ paymentStatus: 'partially_paid' });
  expect(screen.getByRole('combobox', { name: 'bill status' })).toHaveValue('issued');
  rerender(<DocumentStatus type="bill" document={{ status: 'issued' }} onChange={onChange} disabled />);
  screen.getAllByRole('combobox').forEach((control) => expect(control).toBeDisabled());
});

test('bill payments can be recorded and removed for partially paid bills', () => {
  const onChange = jest.fn();
  render(<DocumentStatus type="bill" document={{ status: 'issued', paymentStatus: 'partially_paid', total: 10000, payments: [{ date: '2026-09-01', amount: 5000 }] }} onChange={onChange} />);
  const section = screen.getByText('Payments recorded (1)').closest('.payments-section');
  expect(section).not.toBeNull();
  expect(section.textContent).toContain('2026-09-01');
  expect(section.textContent).toContain('₹ 5,000');

  fireEvent.change(screen.getByLabelText('Payment date'), { target: { value: '2026-09-05' } });
  fireEvent.change(screen.getByLabelText('Payment amount'), { target: { value: '2500' } });
  fireEvent.click(screen.getByText('Add payment'));
  expect(onChange).toHaveBeenLastCalledWith({ payments: [{ date: '2026-09-01', amount: 5000 }, { date: '2026-09-05', amount: 2500 }] });

  const row = within(section).getByText('2026-09-01').closest('.payment-row');
  fireEvent.click(within(row).getByRole('button', { name: 'Remove payment 1' }));
  expect(onChange).toHaveBeenLastCalledWith({ payments: [] });
});

test('partially paid bills show total, received, and pending amounts', () => {
  render(<DocumentStatus type="bill" document={{ status: 'issued', paymentStatus: 'partially_paid', total: 10000, payments: [{ date: '2026-09-01', amount: 3000 }, { date: '2026-09-05', amount: 2000 }] }} onChange={jest.fn()} />);
  const summary = screen.getByText('Total').closest('.payment-summary');
  expect(summary.textContent).toContain('₹ 10,000');
  expect(summary.textContent).toContain('₹ 5,000');
  expect(screen.getByText('Pending').closest('.payment-summary-pending').textContent).toContain('₹ 5,000');
});

test('bills without partial payment do not show the payments section', () => {
  const { rerender } = render(<DocumentStatus type="bill" document={{ status: 'issued', paymentStatus: 'unpaid', total: 10000, payments: [] }} onChange={jest.fn()} />);
  expect(screen.queryByText(/Payments recorded/)).not.toBeInTheDocument();
  expect(screen.queryByText('Total')).not.toBeInTheDocument();
  rerender(<DocumentStatus type="bill" document={{ status: 'issued', paymentStatus: 'paid', total: 10000, payments: [{ date: '2026-09-01', amount: 10000 }] }} onChange={jest.fn()} />);
  expect(screen.queryByText(/Payments recorded/)).not.toBeInTheDocument();
});

test('cancelled bills hide the payment section', () => {
  render(<DocumentStatus type="bill" document={{ status: 'cancelled', paymentStatus: 'unpaid', payments: [] }} onChange={jest.fn()} />);
  expect(screen.queryByRole('combobox', { name: 'Payment status' })).not.toBeInTheDocument();
  expect(screen.queryByText(/Payments recorded/)).not.toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'bill status' })).toHaveValue('cancelled');
});