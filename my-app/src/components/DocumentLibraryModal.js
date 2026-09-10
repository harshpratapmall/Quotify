import { useState } from 'react';
import ActionIcon from './ActionIcon';
import IconButton from './IconButton';
import DocumentStatus from './DocumentStatus';
import ModalHeader from './ModalHeader';
import ModalOverlay from './ModalOverlay';
import SaveStatus from './SaveStatus';
import { APP_ROUTES } from '../config/routes';
import { DOCUMENT_TYPES, documentCopy } from '../config/documents';
import { currency } from '../utils/formatters';
import { parsePayments, getPaymentSummary } from '../utils/payments';

function DocumentLibraryModal({ pathname, documents, openDocument, deleteDocument, startNewDocument, goBack, saveStatus, changeStatus, statusBusy }) {
  const [query, setQuery] = useState('');
  const [openEntry, setOpenEntry] = useState(null);
  const type = pathname === APP_ROUTES.bills ? DOCUMENT_TYPES.bill : DOCUMENT_TYPES.quotation;
  if (pathname !== APP_ROUTES.quotations && pathname !== APP_ROUTES.bills) return null;
  const copy = documentCopy(type);
  const entries = (documents[type] || []).filter((entry) => {
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return [entry.clientName, entry.projectName, entry.owner].filter(Boolean).some((field) => String(field).toLowerCase().includes(needle));
  });
  const toggleEntry = (id) => setOpenEntry((current) => current === id ? null : id);
  return <ModalOverlay onClose={goBack} backdropClass="modal-backdrop library-backdrop" sectionClass={`document-library-modal ${type}`} sectionProps={{ 'aria-labelledby': 'document-library-title' }}>
      <ModalHeader eyebrow="Saved work" title={`${copy.plural} library`} titleId="document-library-title" trailingAction={<div className="modal-action-cluster">
        <IconButton icon="plus" className="accent-icon" label={`New ${copy.singular.toLowerCase()}`} onClick={() => startNewDocument(type, 'library')} />
        <IconButton icon="close" className="modal-close" label={`Close ${copy.plural.toLowerCase()} library`} onClick={goBack} />
      </div>} />
      <div className="library-toolbar">
        <label className="library-search"><span className="library-search-icon" aria-hidden="true" /><input type="search" aria-label={`Search ${copy.plural.toLowerCase()} by username, client, or project`} placeholder="Search by username, client, or project" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
        <p>{entries.length ? `${entries.length} saved ${copy.plural.toLowerCase()}` : 'No saved documents match your search.'}</p>
      </div>
      {entries.length === 0 ? <div className="library-empty"><ActionIcon type={type} /><h3>{query ? 'No matches found' : `No ${copy.plural.toLowerCase()} yet`}</h3><p>{query ? 'Try a different username, client, or project.' : `Create your first ${copy.singular.toLowerCase()} to keep it ready for later.`}</p></div> : <div className="saved-quotation-list document-library-list">
        {entries.map((entry) => {
          const isOpen = openEntry === entry.id;
          const partial = type === DOCUMENT_TYPES.bill && (entry.status || 'draft') !== 'cancelled' && entry.paymentStatus === 'partially_paid';
          const summary = partial ? getPaymentSummary(parsePayments(entry.payments), entry.total) : null;
          return <article className={`saved-quotation-card ${isOpen ? 'is-open' : ''}`} key={entry.id}>
            <div className="library-tile" role="button" tabIndex={0} aria-expanded={isOpen} onClick={() => toggleEntry(entry.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleEntry(entry.id); } }}>
              <div className="library-document-info"><strong>{entry.clientName || 'Untitled client'}</strong><span>{entry.projectName || 'Untitled project'} · {entry.quoteDate || 'No date'}</span><small>{currency(Number(entry.total || 0))}{entry.dueDate ? ` · Due ${entry.dueDate}` : ''}</small>
                {summary && <small className="bill-payment-summary">Received {currency(summary.received)} · Pending {currency(summary.pending)} of {currency(summary.total)}</small>}
              </div>
              <div className="saved-actions">
                <IconButton icon="open" className="color-save" label={`Preview ${copy.singular.toLowerCase()}`} onClick={(event) => { event.stopPropagation(); openDocument(type, entry.id, true); }} />
                <IconButton icon="edit" className="color-link" label={`Edit ${copy.singular.toLowerCase()}`} onClick={(event) => { event.stopPropagation(); openDocument(type, entry.id); }} />
                <IconButton icon="delete" label={`Delete ${copy.singular.toLowerCase()}`} className="danger-icon" onClick={(event) => { event.stopPropagation(); deleteDocument(type, entry.id); }} />
                <IconButton icon="chevron" className={`tile-toggle ${isOpen ? 'is-open' : ''}`} label={isOpen ? `Hide ${copy.singular.toLowerCase()} details` : `Show ${copy.singular.toLowerCase()} details`} onClick={(event) => { event.stopPropagation(); toggleEntry(entry.id); }} />
              </div>
            </div>
            {isOpen && <div className="library-tile-details"><DocumentStatus type={type} document={entry} disabled={statusBusy} onChange={(changes) => changeStatus(type, entry.id, changes)} /></div>}
          </article>;
        })}
      </div>}
      <SaveStatus message={saveStatus} />
    </ModalOverlay>;
}
export default DocumentLibraryModal;
