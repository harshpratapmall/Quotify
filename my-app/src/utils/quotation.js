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

// Overlays a client record onto a quotation: used both when creating a new
// document from a client and when a client is selected in the workspace.
export const applyClientToQuotation = (quotation, client) => {
  if (!client) {
    return { ...quotation, clientId: '' };
  }
  return {
    ...quotation,
    clientId: client.id,
    clientName: client.name,
    phone: client.phone || '',
    email: client.email || '',
    siteLocation: client.address || '',
  };
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
  clientId: quotation.clientId || '',
  dueDate: quotation.dueDate || '',
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
    quotation: {
      ...createEmptyQuotation(),
      ...payload?.quotation,
      clientName: saved.clientName ?? payload?.quotation?.clientName ?? '',
      projectName: saved.projectName ?? payload?.quotation?.projectName ?? '',
      phone: saved.phone ?? payload?.quotation?.phone ?? '',
      email: saved.email ?? payload?.quotation?.email ?? '',
      siteLocation: saved.siteLocation ?? payload?.quotation?.siteLocation ?? '',
      clientId: saved.clientId || '',
      dueDate: saved.dueDate || '',
      status: saved.status || 'draft',
      paymentStatus: saved.paymentStatus || 'unpaid',
      payments: saved.payments || [],
    },
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
