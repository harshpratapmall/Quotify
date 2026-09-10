import ActionIcon from './ActionIcon';
import IconButton from './IconButton';
import DocumentStatus from './DocumentStatus';
import { APP_ROUTES } from '../config/routes';
import { DOCUMENT_TYPES, documentCopy } from '../config/documents';
import { currency } from '../utils/formatters';

function DocumentLibraryModal({ pathname, documents, openDocument, deleteDocument, startNewDocument, navigate, saveStatus, changeStatus, statusBusy }) {
  const type = pathname === APP_ROUTES.bills ? DOCUMENT_TYPES.bill : DOCUMENT_TYPES.quotation;
  if (pathname !== APP_ROUTES.quotations && pathname !== APP_ROUTES.bills) return null;
  const copy = documentCopy(type);
  const entries = documents[type] || [];
  return <div className="modal-backdrop library-backdrop" role="presentation" onMouseDown={() => navigate(APP_ROUTES.home, true)}>
    <section className={`document-library-modal ${type}`} role="dialog" aria-modal="true" aria-labelledby="document-library-title" onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-actions"><div><p className="eyebrow">Saved work</p><h2 id="document-library-title">{copy.plural} library</h2></div><IconButton icon="close" label={`Close ${copy.plural.toLowerCase()} library`} onClick={() => navigate(APP_ROUTES.home, true)} /></div>
      <div className="library-toolbar"><p>{entries.length ? `${entries.length} saved ${copy.plural.toLowerCase()}` : `Your saved ${copy.plural.toLowerCase()} will appear here.`}</p><IconButton icon="plus" label={`New ${copy.singular.toLowerCase()}`} className="accent-icon" onClick={() => startNewDocument(type, 'library')} /></div>
      {entries.length === 0 ? <div className="library-empty"><ActionIcon type={type} /><h3>No {copy.plural.toLowerCase()} yet</h3><p>Create your first {copy.singular.toLowerCase()} to keep it ready for later.</p></div> : <div className="saved-quotation-list document-library-list">
        {entries.map((entry) => <article className="saved-quotation-card" key={entry.id}>
          <div className="library-document-info"><strong>{entry.clientName || 'Untitled client'}</strong><span>{entry.projectName || 'Untitled project'} · {entry.quoteDate || 'No date'}</span><small>{currency(Number(entry.total || 0))}{entry.dueDate ? ` · Due ${entry.dueDate}` : ''}</small>
            <DocumentStatus type={type} document={entry} disabled={statusBusy} onChange={(changes) => changeStatus(type, entry.id, changes)} />
          </div>
          <div className="saved-actions">
            <IconButton icon="open" label={`Preview ${copy.singular.toLowerCase()}`} onClick={() => openDocument(type, entry.id, true)} />
            <IconButton icon="edit" label={`Edit ${copy.singular.toLowerCase()}`} onClick={() => openDocument(type, entry.id)} />
            <IconButton icon="delete" label={`Delete ${copy.singular.toLowerCase()}`} className="danger-icon" onClick={() => deleteDocument(type, entry.id)} />
          </div>
        </article>)}
      </div>}
      {saveStatus && <p className="save-status" role="status">{saveStatus}</p>}
    </section>
  </div>;
}
export default DocumentLibraryModal;
