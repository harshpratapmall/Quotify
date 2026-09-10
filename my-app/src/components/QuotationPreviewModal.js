import { getTodayDate } from '../config/quotation';
import { APP_ROUTES } from '../config/routes';
import { currency } from '../utils/formatters';
import { ANALYTICS_EVENTS, trackAction } from '../utils/analytics';
import { DOCUMENT_TYPES, documentCopy } from '../config/documents';
import { buildWhatsAppUrl } from '../utils/whatsapp';
import IconButton from './IconButton';
import ActionIcon from './ActionIcon';
import DocumentStatus from './DocumentStatus';

function QuotationPreviewModal({
  pathname,
  documentType,
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
  businessProfile,
  createShare,
  shareUrl,
  convertToBill,
  saveStatus,
  changeStatus,
  statusBusy,
}) {
  if (pathname !== APP_ROUTES.quotationPreview && pathname !== APP_ROUTES.billPreview) {
    return null;
  }
  const copy = documentCopy(documentType);

  const closePreview = (source) => {
    trackAction(ANALYTICS_EVENTS.previewClosed, { source, mode: previewOnly ? 'saved' : 'editable', documentType });
    navigate(previewOnly ? APP_ROUTES.home : (documentType === DOCUMENT_TYPES.bill ? APP_ROUTES.billNew : APP_ROUTES.quotationNew), true);
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={() => closePreview('backdrop')}>
      <section className={`quotation-modal ${documentType === DOCUMENT_TYPES.bill ? 'bill-preview-modal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="quotation-preview-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-actions">
          <div>
            <p className="eyebrow">Ready to share</p>
            <h2 id="quotation-preview-title">{copy.singular} Preview</h2>
          </div>
          <button type="button" className="close-button" aria-label={`Close ${copy.singular.toLowerCase()} preview`} onClick={() => closePreview('button')}>x</button>
        </div>
        {activeQuotationId && <DocumentStatus type={documentType} document={quotation} onChange={changeStatus} disabled={statusBusy} />}
        <article className={`quotation-document ${documentType === DOCUMENT_TYPES.bill ? 'bill-document' : ''}`}>
          <div className="document-header">
            <div className="document-brand">{businessProfile?.logoUrl ? <img src={businessProfile.logoUrl} alt="" /> : <span>{(businessProfile?.businessName || 'Q').slice(0, 2).toUpperCase()}</span>}<div><strong>{businessProfile?.businessName || 'Your business'}</strong><small>{copy.singular}</small></div></div>
            <div><strong>{copy.singular.toUpperCase()}</strong><small>{quotation.quoteDate || getTodayDate()}</small></div>
          </div>
          <div className="document-client"><div><small>TO</small><strong>{quotation.clientName || 'Your Client'}</strong><span>{quotation.phone || quotation.email || 'Mobile number to be added'}</span></div><div><small>ADDRESS</small><strong>{quotation.siteLocation || 'Site location to be added'}</strong></div><div><small>{copy.projectLabel.toUpperCase()}</small><strong>{quotation.projectName || 'Interior Project'}</strong></div></div>
          <div className="document-items"><div className="document-item heading"><span>Description</span><span>Qty</span><span>Rate</span><span>Amount</span></div>{items.filter((item) => item.description || item.rate).map((item, index) => <div className="document-item" key={`preview-${index}`}><span>{item.description || 'Untitled item'}</span><span>{item.quantity || 0}</span><span>{currency(Number(item.rate) || 0)}</span><strong>{currency((Number(item.quantity) || 0) * (Number(item.rate) || 0))}</strong></div>)}</div>
          <div className="document-total"><span>Subtotal <strong>{currency(subtotal)}</strong></span>{includeGst && <span>GST ({gstPercentage}%) <strong>{currency(tax)}</strong></span>}<span className="grand-total">{copy.totalLabel} <strong>{currency(total)}</strong></span></div>
          {documentType === DOCUMENT_TYPES.bill && quotation.dueDate && <p className="document-footer">Payment due: {quotation.dueDate}</p>}
          {documentType === DOCUMENT_TYPES.quotation && <p className="document-footer">{businessProfile?.terms || 'Thank you for your business. This quotation is valid for 15 days.'}</p>}
        </article>
        <div className="preview-export-actions">
          <IconButton icon="save" label={activeQuotationId ? `Update Saved ${copy.singular}` : `Save ${copy.singular}`} onClick={() => saveQuotation('preview')} />
          <IconButton icon="download" label="Download as PDF" className="accent-icon" onClick={() => downloadPdf('preview')} />
          {activeQuotationId && <IconButton icon="link" label="Create public link" onClick={createShare} />}
          {documentType === DOCUMENT_TYPES.quotation && activeQuotationId && <button type="button" className="secondary-action compact-action" disabled={['declined', 'expired', 'cancelled'].includes(quotation.status)} onClick={convertToBill}><ActionIcon type="bill" /> Convert to bill</button>}
          <IconButton icon="message" label="Draft WhatsApp message" onClick={async () => { let currentShareUrl = shareUrl; if (!currentShareUrl && activeQuotationId) { currentShareUrl = await createShare(); if (!currentShareUrl) return; } const url = buildWhatsAppUrl({ phone: quotation.phone, businessName: businessProfile?.businessName, documentType, total, shareUrl: currentShareUrl }); if (url) window.open(url, '_blank', 'noopener,noreferrer'); }} />
        </div>
        {shareUrl && <div className="share-link-result" role="status"><span>{shareUrl}</span><IconButton icon="copy" label="Copy link" onClick={() => navigator.clipboard?.writeText(shareUrl)} /></div>}
        {saveStatus && <p className="save-status" role="status">{saveStatus}</p>}
      </section>
    </div>
  );
}

export default QuotationPreviewModal;
