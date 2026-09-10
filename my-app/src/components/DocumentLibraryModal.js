import ActionIcon from './ActionIcon';
import IconButton from './IconButton';
import DocumentStatus from './DocumentStatus';
import ModalHeader from './ModalHeader';
import { APP_ROUTES } from '../config/routes';
import { DOCUMENT_TYPES, documentCopy } from '../config/documents';
import { currency } from '../utils/formatters';

function DocumentLibraryModal({ pathname, documents, openDocument, deleteDocument, startNewDocument, goBack, saveStatus, changeStatus, statusBusy }) {
  const type = pathname === APP_ROUTES.bills ? DOCUMENT_TYPES.bill : DOCUMENT_TYPES.quotation;
  if (pathname !== APP_ROUTES.quotations && pathname !== APP_ROUTES.bills) return null;
  const copy = documentCopy(type);
  const entries = documents[type] || [];
  return <div className="modal-backdrop library-backdrop" role="presentation" onMouseDown={goBack}>
    <section className={`document-library-modal ${type}`} role="dialog" aria-modal="true" aria-labelledby="document-library-title" onMouseDown={(event) => event.stopPropagation()}>
      <ModalHeader eyebrow="Saved work" title={`${copy.plural} library`} titleId="document-library-title" trailingAction={<div className="modal-action-cluster">
        <IconButton icon="plus" className="accent-icon" label={`New ${copy.singular.toLowerCase()}`} onClick={() => startNewDocument(type, 'library')} />
        <IconButton icon="close" className="modal-close" label={`Close ${copy.plural.toLowerCase()} library`} onClick={goBack} />
      </div>} />
      <div className="library-toolbar"><p>{entries.length ? `${entries.length} saved ${copy.plural.toLowerCase()}` : `Your saved ${copy.plural.toLowerCase()} will appear here.`}</p></div>
      {entries.length === 0 ? <div className="library-empty"><ActionIcon type={type} /><h3>No {copy.plural.toLowerCase()} yet</h3><p>Create your first {copy.singular.toLowerCase()} to keep it ready for later.</p></div> : <div className="saved-quotation-list document-library-list">
        {entries.map((entry) => <article className="saved-quotation-card" key={entry.id}>
          <div className="library-document-info"><strong>{entry.clientName || 'Untitled client'}</strong><span>{entry.projectName || 'Untitled project'} · {entry.quoteDate || 'No date'}</span><small>{currency(Number(entry.total || 0))}{entry.dueDate ? ` · Due ${entry.dueDate}` : ''}</small>
            <DocumentStatus type={type} document={entry} disabled={statusBusy} onChange={(changes) => changeStatus(type, entry.id, changes)} />
          </div>
          <div className="saved-actions">
            <IconButton icon="open" className="color-save" label={`Preview ${copy.singular.toLowerCase()}`} onClick={() => openDocument(type, entry.id, true)} />
            <IconButton icon="edit" className="color-link" label={`Edit ${copy.singular.toLowerCase()}`} onClick={() => openDocument(type, entry.id)} />
            <IconButton icon="delete" label={`Delete ${copy.singular.toLowerCase()}`} className="danger-icon" onClick={() => deleteDocument(type, entry.id)} />
          </div>
        </article>)}
      </div>}
      {saveStatus && <p className="save-status" role="status">{saveStatus}</p>}
    </section>
  </div>;
}
export default DocumentLibraryModal;
