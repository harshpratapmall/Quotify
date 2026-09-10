import { buildQuotationPayload, parseSavedQuotationPayload } from './quotation';

test('reopening uses current server metadata instead of stale editable payload metadata', () => {
  const result = parseSavedQuotationPayload({
    clientId: 'client-2', status: 'accepted', paymentStatus: 'paid', dueDate: '2026-10-01',
    payload: JSON.stringify({ quotation: { clientId: 'client-1', status: 'draft', dueDate: '2026-09-01' }, items: [{ description: 'Desk', quantity: 1, rate: 100 }] }),
  });
  expect(result.quotation).toMatchObject({ clientId: 'client-2', status: 'accepted', paymentStatus: 'paid', dueDate: '2026-10-01' });
  expect(result.items[0].description).toBe('Desk');
});

test('legacy rows receive defaults and cleared links do not return from stale payloads', () => {
  const result = parseSavedQuotationPayload({ payload: { quotation: { clientName: 'Customer', clientId: 'old', dueDate: '2026-09-01' } } });
  expect(result.quotation).toMatchObject({ clientName: 'Customer', clientId: '', dueDate: '', status: 'draft', paymentStatus: 'unpaid' });
});

test('saving explicitly clears removed client links and due dates', () => {
  expect(buildQuotationPayload({ quotation: { clientId: '', dueDate: '' }, items: [], includeGst: false })).toMatchObject({ clientId: '', dueDate: '' });
});
