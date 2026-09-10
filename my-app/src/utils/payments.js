// Payments are persisted as a JSON array string in column X; they can already be
// an array when loaded from the active document state.
export const parsePayments = (value) => {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const getPaymentSummary = (payments, total) => {
  const received = payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0);
  const numericTotal = Number(total) || 0;
  return { received, pending: Math.max(0, Math.round((numericTotal - received) * 100) / 100), total: numericTotal };
};