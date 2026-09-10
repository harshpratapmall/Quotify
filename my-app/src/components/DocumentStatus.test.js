import { fireEvent, render, screen } from '@testing-library/react';
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
