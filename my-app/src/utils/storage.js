import {
  createEmptyQuotation,
  defaultGstRate,
  getTodayDate,
  lineItemTemplate,
  getQuotationDraftKey,
} from '../config/quotation';

export const getDocumentDraftKey = (userId, type = 'quotation') =>
  type === 'quotation' ? getQuotationDraftKey(userId) : `${getQuotationDraftKey(userId)}_${type}`;

export const loadQuotationDraft = (userId, type = 'quotation') => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    if (!userId) {
      return null;
    }
    const savedDraft = JSON.parse(window.sessionStorage.getItem(getDocumentDraftKey(userId, type)) || 'null');
    if (!savedDraft || typeof savedDraft !== 'object') {
      return null;
    }

    return savedDraft;
  } catch {
    return null;
  }
};

export const saveQuotationDraft = (userId, draft, type = 'quotation') => {
  if (typeof window === 'undefined') {
    return;
  }

  if (userId) {
    window.sessionStorage.setItem(getDocumentDraftKey(userId, type), JSON.stringify(draft));
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
