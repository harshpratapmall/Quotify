import { buildWhatsAppUrl, normalizeWhatsAppPhone } from './whatsapp';

test('normalizes Indian ten-digit phone numbers', () => {
  expect(normalizeWhatsAppPhone('98765 43210')).toBe('919876543210');
});

test('builds an encoded WhatsApp draft link', () => {
  const url = buildWhatsAppUrl({ phone: '9876543210', businessName: 'Quotify Interiors', documentType: 'quotation', total: '₹10,000', shareUrl: 'https://example.com/share/abc' });
  expect(url).toContain('https://wa.me/919876543210?text=');
  expect(decodeURIComponent(url)).toContain('https://example.com/share/abc');
});