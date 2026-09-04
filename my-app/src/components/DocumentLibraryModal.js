import ActionIcon from './ActionIcon';
import { APP_ROUTES } from '../config/routes';
import { DOCUMENT_TYPES, documentCopy } from '../config/documents';

function DocumentLibraryModal({ pathname, documents, openDocument, deleteDocument, startNewDocument, navigate, saveStatus }) {
  const type = pathname === APP_ROUTES.bills ? DOCUMENT_TYPES.bill : DOCUMENT_TYPES.quotation;
  if (pathname !== APP_ROUTES.quotations && pathname !== APP_ROUTES.bills) return null;

  const copy = documentCopy(type);
  const entries = documents[type] || [];
  return (
    <div className="modal-backdrop library-backdrop" role="presentation" onMouseDown={() => navigate(APP_ROUTES.home, true)}>
      <section className={`document-library-modal ${type}`} role="dialog" aria-modal="true" aria-labelledby="document-library-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-actions"><div><p className="eyebrow">Saved work</p><h2 id="document-library-title">{copy.plural} library</h2></div><button type="button" className="close-button" aria-label={`Close ${copy.plural.toLowerCase()} library`} onClick={() => navigate(APP_ROUTES.home, true)}>x</button></div>
        <div className="library-toolbar"><p>{entries.length ? `${entries.length} saved ${copy.plural.toLowerCase()}` : `Your saved ${copy.plural.toLowerCase()} will appear here.`}</p><button type="button" className={type === DOCUMENT_TYPES.bill ? 'bill-primary-action' : 'primary-action'} onClick={() => startNewDocument(type, 'library')}><ActionIcon type="plus" /> New {copy.singular.toLowerCase()}</button></div>
        {entries.length === 0 ? <div className="library-empty"><ActionIcon type={type} /><h3>No {copy.plural.toLowerCase()} yet</h3><p>Create your first {copy.singular.toLowerCase()} to keep it ready for later.</p></div> : <div className="saved-quotation-list document-library-list">{entries.map((entry) => <article className="saved-quotation-card" key={entry.id}><div><strong>{entry.clientName || 'Untitled client'}</strong><span>{entry.projectName || 'Untitled project'} · {entry.quoteDate || 'No date'}</span><small>₹ {Number(entry.total || 0).toLocaleString('en-IN')}</small></div><div className="saved-actions"><button type="button" className="icon-action" aria-label={`Preview ${copy.singular.toLowerCase()}`} title="Preview" onClick={() => openDocument(type, entry.id, true)}><ActionIcon type="open" /></button><button type="button" className="icon-action" aria-label={`Edit ${copy.singular.toLowerCase()}`} title="Edit" onClick={() => openDocument(type, entry.id)}><ActionIcon type="edit" /></button><button type="button" className="icon-action delete-action" aria-label={`Delete ${copy.singular.toLowerCase()}`} title="Delete" onClick={() => deleteDocument(type, entry.id)}><ActionIcon type="delete" /></button></div></article>)}</div>}
        {saveStatus && <p className="save-status" role="status">{saveStatus}</p>}
      </section>
    </div>
  );
}

export default DocumentLibraryModal;
