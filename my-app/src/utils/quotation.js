import {
  createEmptyQuotation,
  defaultGstRate,
  lineItemTemplate,
} from '../config/quotation';

export const calculateQuotationTotals = (items, includeGst, gstRate) => {
  const subtotal = items.reduce((sum, item) => {
    const quantity = Number(item.quantity) || 0;
    const rate = Number(item.rate) || 0;
    return sum + quantity * rate;
  }, 0);

  const gstPercentage = Number(gstRate) || 0;
  const tax = includeGst ? subtotal * (gstPercentage / 100) : 0;
  const total = subtotal + tax;

  return { subtotal, gstPercentage, tax, total };
};

export const getQuotationValidationError = (quotation, items) => {
  if (!quotation.clientName.trim()) return 'Enter a client name before continuing.';
  if (!quotation.projectName.trim()) return 'Enter a project name before continuing.';
  if (!quotation.siteLocation.trim()) return 'Enter a site location before continuing.';

  const hasPricedItem = items.some((item) => (
    item.description.trim() && Number(item.quantity) > 0 && Number(item.rate) > 0
  ));

  if (!hasPricedItem) {
    return 'Add at least one item with a description, quantity, and rate.';
  }

  return '';
};

export const buildQuotationPayload = ({
  quotation,
  items,
  includeGst,
  gstRate,
  subtotal,
  tax,
  total,
}) => ({
  clientName: quotation.clientName,
  projectName: quotation.projectName,
  phone: quotation.phone,
  email: quotation.email,
  siteLocation: quotation.siteLocation,
  quoteDate: quotation.quoteDate,
  scopeOfWork: quotation.scopeOfWork,
  includeGst,
  gstRate,
  payload: { quotation, items, includeGst, gstRate },
  subtotal,
  tax,
  total,
});

export const parseSavedQuotationPayload = (saved) => {
  let payload = saved.payload;

  if (typeof payload === 'string') {
    try {
      payload = JSON.parse(payload);
    } catch {
      payload = {};
    }
  }

  return {
    quotation: payload?.quotation || createEmptyQuotation(),
    items: Array.isArray(payload?.items) && payload.items.length
      ? payload.items
      : [{ ...lineItemTemplate }],
    includeGst: payload?.includeGst ?? true,
    gstRate: payload?.gstRate ?? defaultGstRate,
  };
};

export const getPrintableItems = (items) => {
  const populatedItems = items.filter((item) => item.description || item.rate);
  return populatedItems.length
    ? populatedItems
    : [{ ...lineItemTemplate, description: 'No line items added' }];
};
