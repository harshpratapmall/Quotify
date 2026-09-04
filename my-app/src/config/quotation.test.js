import { getTodayDate } from './quotation';

test('uses the India business date instead of the UTC date', () => {
  expect(getTodayDate(new Date('2026-09-03T20:00:00.000Z'))).toBe('2026-09-04');
});
