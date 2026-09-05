export const normalizeWhatsAppPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

export const buildWhatsAppUrl = ({ phone, businessName, documentType, total, shareUrl }) => {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone || !shareUrl) return '';
  const message = `Hello, ${businessName || 'your business'} has shared a ${documentType || 'document'} with you. Total: ${total}. View it here: ${shareUrl}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};