export const clientInitials = (clientName) => {
  const initials = String(clientName || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

  return initials || 'CLIENT';
};

export const currency = (amount) =>
  `₹ ${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
