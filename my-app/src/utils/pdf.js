// PDF generation is loaded only when the user downloads a document.
export const downloadQuotationPdf = async (options) => {
  const { generateDocumentPdf } = await import('./documentPdf');
  const { pdf, filename } = await generateDocumentPdf(options);
  pdf.save(filename);
};
