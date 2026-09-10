import { parsePayments, getPaymentSummary } from './payments';

describe('parsePayments', () => {
  test('parses a JSON string of payments', () => {
    expect(parsePayments('[{"date":"2026-09-01","amount":500}]')).toEqual([{ date: '2026-09-01', amount: 500 }]);
  });

  test('keeps array values as-is', () => {
    expect(parsePayments([{ date: '2026-09-01', amount: 500 }])).toEqual([{ date: '2026-09-01', amount: 500 }]);
  });

  test('returns [] for empty, missing, or invalid values', () => {
    expect(parsePayments('')).toEqual([]);
    expect(parsePayments(undefined)).toEqual([]);
    expect(parsePayments('not json')).toEqual([]);
    expect(parsePayments('{"amount":500}')).toEqual([]);
  });
});

describe('getPaymentSummary', () => {
  const payments = [
    { date: '2026-09-01', amount: '300' },
    { date: '2026-09-05', amount: 200 },
  ];

  test('sums received amount and computes pending from total', () => {
    expect(getPaymentSummary(payments, 1000)).toEqual({ received: 500, pending: 500, total: 1000 });
  });

  test('never reports a negative pending amount', () => {
    expect(getPaymentSummary(payments, 400).pending).toBe(0);
  });

  test('handles a missing total as zero', () => {
    expect(getPaymentSummary(payments, undefined).total).toBe(0);
  });
});