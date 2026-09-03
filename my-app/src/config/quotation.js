export const lineItemTemplate = { description: '', quantity: '1', rate: '' };
export const quotationDraftKey = 'quotify_active_quotation';
export const defaultGstRate = '18';

export const getTodayDate = () => new Date().toISOString().slice(0, 10);

export const createEmptyQuotation = () => ({
  clientName: '',
  projectName: '',
  phone: '',
  email: '',
  siteLocation: '',
  quoteDate: getTodayDate(),
  scopeOfWork: '',
});
