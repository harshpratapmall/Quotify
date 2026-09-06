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
  projectLabel: 'Job/Work Name',
} : {
  singular: 'Quotation',
  plural: 'Quotations',
  dateLabel: 'Quote Date',
  noteLabel: 'Additional Notes',
  notePlaceholder: 'Add any additional notes or details.',
  totalLabel: 'Total Estimate',
  projectLabel: 'Project Name',
};
