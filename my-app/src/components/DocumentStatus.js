import { billStatuses, paymentStatuses, quotationStatuses, statusLabel } from '../config/statuses';

export default function DocumentStatus({ type, document, onChange, disabled }) {
  return <div className="document-status-controls">
    <label>Status<select aria-label={`${type} status`} value={document.status || 'draft'} disabled={disabled} onChange={(event) => onChange({ status: event.target.value })}>
      {(type === 'bill' ? billStatuses : quotationStatuses).map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
    </select></label>
    {type === 'bill' && <label>Payment<select aria-label="Payment status" value={document.paymentStatus || 'unpaid'} disabled={disabled} onChange={(event) => onChange({ paymentStatus: event.target.value })}>
      {paymentStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}
    </select></label>}
  </div>;
}
