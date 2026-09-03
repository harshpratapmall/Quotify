import { getTodayDate } from '../config/quotation';
import { APP_ROUTES } from '../config/routes';
import { currency } from '../utils/formatters';

function QuotationPreviewModal({
  pathname,
  previewOnly,
  quotation,
  items,
  includeGst,
  gstPercentage,
  subtotal,
  tax,
  total,
  activeQuotationId,
  saveQuotation,
  downloadPdf,
  navigate,
}) {
  if (pathname !== APP_ROUTES.quotationPreview) {
    return null;
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => navigate(APP_ROUTES.quotationNew, true)}>
      <section className="quotation-modal" role="dialog" aria-modal="true" aria-labelledby="quotation-preview-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-actions">
          <div>
            <p className="eyebrow">Ready to share</p>
            <h2 id="quotation-preview-title">Quotation Preview</h2>
          </div>
          <button type="button" className="close-button" aria-label="Close quotation preview" onClick={() => navigate(previewOnly ? APP_ROUTES.home : APP_ROUTES.quotationNew, true)}>x</button>
        </div>
        <article className="quotation-document">
          <div className="document-header">
            <div className="document-brand"><span>D2D</span><div><strong>Door2Door Interiors</strong><small>Interior design quotation</small></div></div>
            <div><strong>QUOTATION</strong><small>{quotation.quoteDate || getTodayDate()}</small></div>
          </div>
          <div className="document-client"><div><small>TO</small><strong>{quotation.clientName || 'Your Client'}</strong><span>{quotation.phone || quotation.email || 'Mobile number to be added'}</span></div><div><small>ADDRESS</small><strong>{quotation.siteLocation || 'Site location to be added'}</strong></div><div><small>PROJECT</small><strong>{quotation.projectName || 'Interior Project'}</strong></div></div>
          <div className="document-scope"><small>SCOPE OF WORK</small><p>{quotation.scopeOfWork || 'Project scope will be added here.'}</p></div>
          <div className="document-items"><div className="document-item heading"><span>Description</span><span>Qty</span><span>Rate</span><span>Amount</span></div>{items.filter((item) => item.description || item.rate).map((item, index) => <div className="document-item" key={`preview-${index}`}><span>{item.description || 'Untitled item'}</span><span>{item.quantity || 0}</span><span>{currency(Number(item.rate) || 0)}</span><strong>{currency((Number(item.quantity) || 0) * (Number(item.rate) || 0))}</strong></div>)}</div>
          <div className="document-total"><span>Subtotal <strong>{currency(subtotal)}</strong></span>{includeGst && <span>GST ({gstPercentage}%) <strong>{currency(tax)}</strong></span>}<span className="grand-total">Total Estimate <strong>{currency(total)}</strong></span></div>
          <p className="document-footer">Thank you for choosing Door2Door Interiors. This quotation is valid for 15 days.</p>
        </article>
        <div className="preview-export-actions">
          <button type="button" className="secondary-action" onClick={saveQuotation}>{activeQuotationId ? 'Update Saved Quotation' : 'Save Quotation'}</button>
          <button type="button" className="primary-action" onClick={downloadPdf}>Download as PDF</button>
        </div>
      </section>
    </div>
  );
}

export default QuotationPreviewModal;
