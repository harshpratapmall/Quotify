import {
  createEmptyQuotation,
  defaultGstRate,
  getTodayDate,
  lineItemTemplate,
  getQuotationDraftKey,
} from '../config/quotation';

export const loadQuotationDraft = (userId) => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    if (!userId) {
      return null;
    }
    const savedDraft = JSON.parse(window.sessionStorage.getItem(getQuotationDraftKey(userId)) || 'null');
    if (!savedDraft || typeof savedDraft !== 'object') {
      return null;
    }

    return savedDraft;
  } catch {
    return null;
  }
};

export const saveQuotationDraft = (userId, draft) => {
  if (typeof window === 'undefined') {
    return;
  }

  if (userId) {
    window.sessionStorage.setItem(getQuotationDraftKey(userId), JSON.stringify(draft));
  }
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
