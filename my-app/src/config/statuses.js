export const quotationStatuses = ['draft', 'sent', 'viewed', 'accepted', 'declined', 'cancelled'];
export const billStatuses = ['draft', 'issued', 'cancelled'];
export const paymentStatuses = ['unpaid', 'partially_paid', 'paid', 'overdue'];
export const statusLabel = (value = '') => value.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
