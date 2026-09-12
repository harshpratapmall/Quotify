import { buildEmployeeWhatsAppUrl, buildPhoneLink, buildWhatsAppUrl, normalizeWhatsAppPhone } from './whatsapp';

test('normalizes Indian ten-digit phone numbers', () => {
  expect(normalizeWhatsAppPhone('98765 43210')).toBe('919876543210');
});

test('builds an encoded WhatsApp draft link for quotations', () => {
  const url = buildWhatsAppUrl({ phone: '9876543210', businessName: 'Quotify Interiors', documentType: 'quotation', total: '₹10,000', shareUrl: 'https://example.com/share/abc' });
  expect(url).toContain('https://wa.me/919876543210?text=');
  expect(decodeURIComponent(url)).toContain('https://example.com/share/abc');
});

test('builds an encoded WhatsApp draft link for bills', () => {
  const url = buildWhatsAppUrl({ phone: '9876543210', businessName: 'Quotify Interiors', documentType: 'bill', total: '₹10,000', shareUrl: 'https://example.com/share/abc' });
  expect(url).toContain('https://wa.me/919876543210?text=');
  expect(decodeURIComponent(url)).toContain('https://example.com/share/abc');
});

test('builds an employee WhatsApp draft link', () => {
  const url = buildEmployeeWhatsAppUrl('Ravi', '9876543210');
  expect(url).toContain('https://wa.me/919876543210?text=');
  expect(decodeURIComponent(url)).toContain('Hello, Ravi.');
});

test('builds no WhatsApp link without a phone', () => {
  expect(buildEmployeeWhatsAppUrl('Ravi', '')).toBe('');
});

test('builds a tel link from a phone number', () => {
  expect(buildPhoneLink('98765 43210')).toBe('tel:+919876543210');
  expect(buildPhoneLink('')).toBe('');
});