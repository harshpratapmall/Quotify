export const normalizeWhatsAppPhone = (value) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 10) return `91${digits}`;
  return digits;
};

export const buildWhatsAppUrl = ({ phone, businessName, documentType, total, shareUrl }) => {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) return '';
  const isBill = documentType === 'bill';
  const message = isBill
    ? `Hello, ${businessName || 'your business'} has prepared your bill. Total due: ${total}.${shareUrl ? ` View it here: ${shareUrl}` : ''}`
    : `Hello, ${businessName || 'your business'} has shared your quotation. Total estimate: ${total}.${shareUrl ? ` View it here: ${shareUrl}` : ''}`;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
};