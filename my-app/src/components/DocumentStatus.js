import { useState } from 'react';
import IconButton from './IconButton';
import { currency } from '../utils/formatters';
import { parsePayments, getPaymentSummary } from '../utils/payments';
import { billStatuses, paymentStatuses, quotationStatuses, statusLabel } from '../config/statuses';

export default function DocumentStatus({ type, document, onChange, disabled }) {
  const isBill = type === 'bill';
  const payments = parsePayments(document.payments);
  const cancelled = isBill && (document.status || '').toLowerCase() === 'cancelled';
  const partialPayment = isBill && !cancelled && document.paymentStatus === 'partially_paid';
  const { received, pending, total } = getPaymentSummary(payments, document.total);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');

  const addPayment = () => {
    const date = paymentDate || new Date().toISOString().slice(0, 10);
    const amount = Number(paymentAmount);
    if (!date || !amount || amount <= 0) return;
    onChange({ payments: [...payments, { date, amount }] });
    setPaymentDate('');
    setPaymentAmount('');
  };

  const removePayment = (index) => {
    onChange({ payments: payments.filter((_, paymentIndex) => paymentIndex !== index) });
  };

  return <div className={`document-status-controls ${type}`}>
    <label>Status<select aria-label={`${type} status`} value={document.status || 'draft'} disabled={disabled} onChange={(event) => onChange({ status: event.target.value })}>
      {(isBill ? billStatuses : quotationStatuses).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
    </select></label>
    {isBill && !cancelled && <>
      <label>Payment<select aria-label="Payment status" value={document.paymentStatus || 'unpaid'} disabled={disabled} onChange={(event) => onChange({ paymentStatus: event.target.value })}>
        {paymentStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
      </select></label>
    </>}
    {partialPayment && <>
      <div className="payment-summary">
        <span>Total <strong>{currency(total)}</strong></span>
        <span>Received <strong>{currency(received)}</strong></span>
        <span className="payment-summary-pending">Pending <strong>{currency(pending)}</strong></span>
      </div>
      <div className="payments-section">
        <span className="payments-heading">Payments recorded{payments.length ? ` (${payments.length})` : ''}</span>
        {payments.length === 0 && <span className="payments-empty">No payments recorded. Add one below.</span>}
        {payments.map((payment, index) => (
          <div className="payment-row" key={`${payment.date}-${index}`}>
            <span>{payment.date}</span>
            <strong>{currency(payment.amount)}</strong>
            <IconButton icon="delete" className="danger-icon" label={`Remove payment ${index + 1}`} disabled={disabled} onClick={() => removePayment(index)} />
          </div>
        ))}
        <div className="payment-form">
          <label>Date<input type="date" aria-label="Payment date" value={paymentDate} disabled={disabled} onChange={(event) => setPaymentDate(event.target.value)} /></label>
          <label>Amount<input type="number" min="0" step="0.01" aria-label="Payment amount" value={paymentAmount} disabled={disabled} onChange={(event) => setPaymentAmount(event.target.value)} placeholder="0" /></label>
          <button type="button" className="secondary-action compact-action" disabled={disabled || !(Number(paymentAmount) > 0)} onClick={addPayment}>Add payment</button>
        </div>
      </div>
    </>}
  </div>;
}