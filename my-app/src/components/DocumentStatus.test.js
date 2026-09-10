import { fireEvent, render, screen, within } from '@testing-library/react';
import DocumentStatus from './DocumentStatus';

test('quotation decisions send lifecycle status changes', () => {
  const onChange = jest.fn();
  render(<DocumentStatus type="quotation" document={{ status: 'sent' }} onChange={onChange} />);
  fireEvent.change(screen.getByRole('combobox', { name: 'quotation status' }), { target: { value: 'accepted' } });
  expect(onChange).toHaveBeenCalledWith({ status: 'accepted' });
  expect(screen.queryByRole('combobox', { name: 'Payment status' })).not.toBeInTheDocument();
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

test('bill payments can be recorded and removed', () => {
  const onChange = jest.fn();
  render(<DocumentStatus type="bill" document={{ status: 'issued', payments: [{ date: '2026-09-01', amount: 5000 }] }} onChange={onChange} />);
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

test('cancelled bills hide the payment section', () => {
  render(<DocumentStatus type="bill" document={{ status: 'cancelled', paymentStatus: 'unpaid', payments: [] }} onChange={jest.fn()} />);
  expect(screen.queryByRole('combobox', { name: 'Payment status' })).not.toBeInTheDocument();
  expect(screen.queryByText(/Payments recorded/)).not.toBeInTheDocument();
  expect(screen.getByRole('combobox', { name: 'bill status' })).toHaveValue('cancelled');
});