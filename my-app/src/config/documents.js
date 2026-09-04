export const DOCUMENT_TYPES = {
  quotation: 'quotation',
  bill: 'bill',
};

export const documentCopy = (type) => type === DOCUMENT_TYPES.bill ? {
  singular: 'Bill',
  plural: 'Bills',
  dateLabel: 'Bill Date',
  noteLabel: 'Billing Notes',
  notePlaceholder: 'Add payment terms, completed work, or billing details.',
  totalLabel: 'Total Due',
} : {
  singular: 'Quotation',
  plural: 'Quotations',
  dateLabel: 'Quote Date',
  noteLabel: 'Scope of Work',
  notePlaceholder: 'Describe rooms, finishes, materials, and installation details.',
  totalLabel: 'Total Estimate',
};
