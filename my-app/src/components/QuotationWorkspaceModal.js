import { APP_ROUTES } from '../config/routes';
import ActionIcon from './ActionIcon';
import { ANALYTICS_EVENTS, trackAction } from '../utils/analytics';
import { DOCUMENT_TYPES, documentCopy } from '../config/documents';

function QuotationWorkspaceModal({
  pathname,
  documentType,
  previewOnly,
  navigate,
  activeQuotationId,
  quotation,
  items,
  includeGst,
  gstRate,
  gstPercentage,
  subtotal,
  tax,
  total,
  saveStatus,
  handleQuotationChange,
  handleItemChange,
  removeLineItem,
  addLineItem,
  setIncludeGst,
  setGstRate,
  clearQuotation,
  saveQuotation,
  generateQuotation,
}) {
  if (
    pathname !== APP_ROUTES.quotationNew &&
    pathname !== APP_ROUTES.billNew &&
    !(pathname === APP_ROUTES.quotationPreview && !previewOnly) &&
    !(pathname === APP_ROUTES.billPreview && !previewOnly)
  ) {
    return null;
  }

  const copy = documentCopy(documentType);
  const isBill = documentType === DOCUMENT_TYPES.bill;

  const closeWorkspace = (source) => {
    trackAction(ANALYTICS_EVENTS.workspaceClosed, { source, documentType });
    navigate(APP_ROUTES.home, true);
  };

  const resetWorkspace = () => {
    trackAction(ANALYTICS_EVENTS.workspaceReset, { documentType });
    clearQuotation();
  };

  const addItem = () => {
    trackAction(ANALYTICS_EVENTS.lineItemAdded);
    addLineItem();
  };

  const removeItem = (index) => {
    trackAction(ANALYTICS_EVENTS.lineItemRemoved);
    removeLineItem(index);
  };

  const toggleGst = (enabled) => {
    trackAction(ANALYTICS_EVENTS.gstToggled, { enabled });
    setIncludeGst(enabled);
  };

  return (
    <div className={`form-modal-backdrop ${documentType === DOCUMENT_TYPES.bill ? 'bill-workspace-backdrop' : ''}`} role="presentation" onMouseDown={() => closeWorkspace('backdrop')}>
      <section className={`form-card form-workspace-modal ${documentType === DOCUMENT_TYPES.bill ? 'bill-workspace' : ''}`} role="dialog" aria-modal="true" aria-labelledby="quotation-workspace-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="section-heading">
          <div>
            <p className="eyebrow">{copy.singular} Workspace</p>
            <h3 id="quotation-workspace-title">{activeQuotationId ? `Edit saved ${copy.singular.toLowerCase()}` : `Create a new ${copy.singular.toLowerCase()}`}</h3>
          </div>
          <p className="section-text">
            Fill in project details, add pricing lines, and review totals
            instantly.
          </p>
          <button type="button" className="workspace-close" aria-label="Close quotation workspace" onClick={() => closeWorkspace('button')}>x</button>
        </div>

        <form className="quotation-form" onSubmit={generateQuotation}>
          <div className="form-grid">
            <label>
              Client Name
              <input type="text" value={quotation.clientName} onChange={(event) => handleQuotationChange('clientName', event.target.value)} placeholder="Enter client name" />
            </label>
            <label>
              {copy.projectLabel}
              <input type="text" value={quotation.projectName} onChange={(event) => handleQuotationChange('projectName', event.target.value)} placeholder={isBill ? 'Completed work or job reference' : '3BHK Interior Package'} />
            </label>
            <label>
              Phone Number
              <input type="tel" value={quotation.phone} onChange={(event) => handleQuotationChange('phone', event.target.value)} placeholder="+91 98765 43210" />
            </label>
            <label>
              Email Address
              <input type="email" value={quotation.email} onChange={(event) => handleQuotationChange('email', event.target.value)} placeholder="client@email.com" />
            </label>
            <label>
              Site Location
              <input type="text" value={quotation.siteLocation} onChange={(event) => handleQuotationChange('siteLocation', event.target.value)} placeholder="Project address" />
            </label>
            <label>
              {copy.dateLabel}
              <input type="date" value={quotation.quoteDate} onChange={(event) => handleQuotationChange('quoteDate', event.target.value)} />
            </label>
          </div>

          <div className="line-items">
            <div className="line-items-header">
              <h4>Items</h4>
            </div>

            {items.map((item, index) => (
              <div className="line-item-row" key={`item-${index}`}>
                <label>
                  Description
                  <input
                    type="text"
                    value={item.description}
                    onChange={(event) => handleItemChange(index, 'description', event.target.value)}
                    placeholder="Wardrobe, kitchen shutters, TV unit..."
                  />
                </label>
                <label>
                  Qty
                  <input
                    type="number"
                    min="0"
                    value={item.quantity}
                    onChange={(event) => handleItemChange(index, 'quantity', event.target.value)}
                  />
                </label>
                <label>
                  Rate
                  <input
                    type="number"
                    min="0"
                    value={item.rate}
                    onChange={(event) => handleItemChange(index, 'rate', event.target.value)}
                    placeholder="0"
                  />
                </label>
                {items.length > 1 && (
                  <button
                    type="button"
                    className="remove-item-action"
                    onClick={() => removeItem(index)}
                    aria-label={`Remove item ${index + 1}`}
                    title="Remove item"
                  >
                    <ActionIcon type="delete" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              className="add-item-action"
              onClick={addItem}
            >
              + Add another item
            </button>
          </div>

          <div className="gst-controls">
            <label className="gst-toggle">
              <input type="checkbox" checked={includeGst} onChange={(event) => toggleGst(event.target.checked)} />
              <span>Include GST in this {copy.singular.toLowerCase()}</span>
            </label>
            {includeGst && (
              <label className="gst-rate">
                GST Rate (%)
                <input type="number" min="0" max="100" step="0.01" value={gstRate} onChange={(event) => setGstRate(event.target.value)} />
              </label>
            )}
          </div>

          <div className="summary-card">
            <div>
              <span>Subtotal</span>
              <strong>₹ {subtotal.toLocaleString('en-IN')}</strong>
            </div>
            <div>
              <span>{includeGst ? `GST (${gstPercentage}%)` : 'GST (not included)'}</span>
              <strong>₹ {tax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</strong>
            </div>
            <div className="summary-total">
              <span>{copy.totalLabel}</span>
              <strong>
                ₹{' '}
                {total.toLocaleString('en-IN', {
                  maximumFractionDigits: 0,
                })}
              </strong>
            </div>
          </div>

          <div className="footer-actions">
            <button type="button" className="clean-slate-action" onClick={resetWorkspace}>
              Clean Slate
            </button>
            <button type="button" className="secondary-action" onClick={() => saveQuotation('workspace')}>{activeQuotationId ? `Update Saved ${copy.singular}` : `Save ${copy.singular}`}</button>
            <button type="submit" className={documentType === DOCUMENT_TYPES.bill ? 'bill-primary-action' : 'primary-action'}>
              Generate {copy.singular}
            </button>
          </div>
          {saveStatus && <p className="save-status" role="status">{saveStatus}</p>}
        </form>
      </section>
    </div>
  );
}

export default QuotationWorkspaceModal;
