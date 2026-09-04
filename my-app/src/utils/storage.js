import {
  createEmptyQuotation,
  defaultGstRate,
  getTodayDate,
  lineItemTemplate,
  quotationDraftKey,
} from '../config/quotation';

export const loadQuotationDraft = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const savedDraft = JSON.parse(window.sessionStorage.getItem(quotationDraftKey) || 'null');
    if (!savedDraft || typeof savedDraft !== 'object') {
      return null;
    }

    return savedDraft;
  } catch {
    return null;
  }
};

export const saveQuotationDraft = (draft) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(quotationDraftKey, JSON.stringify(draft));
};

export const createDraftState = (draft, resetNewQuotationDate = false) => {
  const activeQuotationId = draft?.activeQuotationId || null;
  const quotation = draft?.quotation || createEmptyQuotation();

  return {
    items: draft?.items || [{ ...lineItemTemplate }],
    includeGst: draft?.includeGst ?? true,
    gstRate: draft?.gstRate ?? defaultGstRate,
    quotation: resetNewQuotationDate && !activeQuotationId
      ? { ...quotation, quoteDate: getTodayDate() }
      : quotation,
    activeQuotationId,
  };
};
