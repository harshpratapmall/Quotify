export const lineItemTemplate = { description: '', quantity: '1', rate: '' };
export const quotationDraftKey = 'quotify_active_quotation';
export const defaultGstRate = '18';
export const businessTimeZone = 'Asia/Kolkata';

export const getTodayDate = (date = new Date()) => {
  const dateParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: businessTimeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const values = Object.fromEntries(
    dateParts
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, value])
  );

  return `${values.year}-${values.month}-${values.day}`;
};

export const createEmptyQuotation = () => ({
  clientName: '',
  projectName: '',
  phone: '',
  email: '',
  siteLocation: '',
  quoteDate: getTodayDate(),
  scopeOfWork: '',
});
