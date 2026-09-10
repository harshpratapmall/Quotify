export const quotationStatuses = ['draft', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'cancelled'];
export const billStatuses = ['draft', 'issued', 'cancelled'];
export const paymentStatuses = ['unpaid', 'partially_paid', 'paid', 'overdue', 'cancelled'];
export const statusLabel = (value = '') => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
