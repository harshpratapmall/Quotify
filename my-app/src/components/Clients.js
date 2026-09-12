import { useCallback, useEffect, useState } from 'react';
import ActionIcon from './ActionIcon';
import IconButton from './IconButton';
import ModalOverlay from './ModalOverlay';
import SaveStatus from './SaveStatus';
import WorkspaceControls from './WorkspaceControls';
import { statusLabel } from '../config/statuses';
import { APP_ROUTES } from '../config/routes';
import { currency } from '../utils/formatters';
import { createClient, deleteClient, listClients, listClientDocuments, updateClient } from '../services/clients';

const emptyClient = { name: '', phone: '', email: '', address: '', notes: '' };

function Clients({ navigate, pathname, startNewDocument, openDocument }) {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyClient);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [documents, setDocuments] = useState({ quotation: [], bill: [] });
const [loadingDocuments, setLoadingDocuments] = useState(false);
  const [message, setMessage] = useState('');
  const [documentError, setDocumentError] = useState('');

  useEffect(() => {
    if (!selectedClient) return undefined;
    let active = true;
    setLoadingDocuments(true);
    setDocumentError('');
    setDocuments({ quotation: [], bill: [] });
    listClientDocuments(selectedClient.id).then(({ response, data }) => {
      if (!response.ok) throw new Error(data?.error || 'Unable to load client documents.');
      if (active) setDocuments(data);
    }).catch((error) => active && setDocumentError(error.message))
      .finally(() => active && setLoadingDocuments(false));
    return () => { active = false; };
  }, [selectedClient]);

  const refreshClients = useCallback(async () => {
    const { response, data } = await listClients(searchTerm);
    if (!response.ok) {
      throw new Error(data?.error || 'Unable to load clients.');
    }
    setClients(Array.isArray(data) ? data : []);
  }, [searchTerm]);

  useEffect(() => {
    refreshClients().catch((error) => setMessage(error.message));
  }, [refreshClients]);

  const change = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = () => {
    setForm(emptyClient);
    setEditingId(null);
    setShowAddClient(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const result = editingId ? await updateClient(editingId, form) : await createClient(form);
      if (!result.response.ok) {
        setMessage(result.data?.error || 'Unable to save client.');
        return;
      }
      setMessage(editingId ? 'Client updated.' : 'Client added.');
      resetForm();
      await refreshClients();
    } catch {
      setMessage('Unable to save client.');
    } finally {
      setIsSaving(false);
    }
  };

  const edit = (client) => {
    setEditingId(client.id);
    setForm({ name: client.name || '', phone: client.phone || '', email: client.email || '', address: client.address || '', notes: client.notes || '' });
    setShowAddClient(true);
  };

  const remove = async () => {
    if (!editingId) return;
    if (!window.confirm('Delete this client? Saved quotations and bills for this client keep their client name but will no longer appear in the client history. This cannot be undone.')) return;
    setMessage('Deleting...');
    try {
      const result = await deleteClient(editingId);
      if (!result.response.ok) {
        setMessage(result.data?.error || 'Unable to delete client.');
        return;
      }
      setMessage('Client deleted.');
      resetForm();
      await refreshClients();
    } catch {
      setMessage('Unable to delete client. Please try again.');
    }
  };

if (pathname !== APP_ROUTES.clients) return null;

  return (
    <ModalOverlay onClose={() => navigate(APP_ROUTES.home)} backdropClass="form-modal-backdrop" sectionClass="form-card form-workspace-modal" sectionProps={{ 'aria-labelledby': 'clients-title' }}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Client Workspace</p>
          <h3 id="clients-title">Clients</h3>
        </div>
        <p className="section-text">Keep client details ready for every quotation and bill.</p>
        <WorkspaceControls className="workspace-actions" actions={[
          { type: 'plus', label: 'Add client', onClick: () => { setEditingId(null); setForm(emptyClient); setShowAddClient(true); } },
          { type: 'close', label: 'Close client workspace', onClick: () => navigate(APP_ROUTES.home) },
        ]} />
      </div>
      <SaveStatus message={message} />

      <section className="admin-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your records</p>
            <h2>Client directory</h2>
          </div>
          <div className="header-actions">
            <span className="client-count">{clients.length} {clients.length === 1 ? 'client' : 'clients'}</span>
          </div>
        </div>
        <input className="admin-search" aria-label="Search clients" placeholder="Search by name, phone, or email" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        <div className="admin-user-list">
          {clients.map((client) => (
            <article className={`admin-user-row client-row ${client.status}`} key={client.id}>
              <div>
                <button type="button" className="client-name-button" onClick={() => setSelectedClient(client)}>{client.name}</button>
                <span>{client.phone || 'No phone'}{client.email ? ` · ${client.email}` : ''}</span>
                {client.address && <small>{client.address}</small>}
              </div>
<div className="saved-actions">
                <IconButton icon="library" className="color-download" label={`Documents for ${client.name}`} onClick={() => setSelectedClient(client)} />
                <IconButton icon="edit" className="color-link" label={`Edit ${client.name}`} onClick={() => edit(client)} />
              </div>
            </article>
          ))}
        </div>
        {!clients.length && <p className="section-text">No clients match your search.</p>}
      </section>

      {showAddClient && (
        <ModalOverlay onClose={() => resetForm()} portal sectionClass="record-form-modal client-record-modal" sectionProps={{ 'aria-labelledby': 'client-form-title' }}>
          <div className="record-form-header">
            <div className="record-form-heading">
              <span className="record-form-icon"><ActionIcon type="profile" /></span>
              <div>
                <p className="eyebrow">Client record</p>
                <h2 id="client-form-title">{editingId ? 'Edit client' : 'Add a client'}</h2>
                <p className="record-form-description">Save the contact details you use for quotations and bills.</p>
              </div>
            </div>
            <IconButton icon="close" className="modal-close" label={editingId ? 'Cancel editing client' : 'Close add client'} onClick={resetForm} />
          </div>
          <form className="record-form" onSubmit={submit}>
            <SaveStatus message={message} className="record-form-status" />
            <section className="record-form-section" aria-labelledby="client-contact-title">
              <div className="record-form-section-heading">
                <p className="eyebrow">Contact details</p>
                <span id="client-contact-title">Name is required</span>
              </div>
              <div className="record-form-grid">
                <label className="record-field"><span>Name <b>Required</b></span><input value={form.name} onChange={(event) => change('name', event.target.value)} placeholder="Client name" required /></label>
                <label className="record-field"><span>Phone</span><input type="tel" value={form.phone} onChange={(event) => change('phone', event.target.value)} placeholder="+91 98765 43210" /></label>
                <label className="record-field"><span>Email</span><input type="email" value={form.email} onChange={(event) => change('email', event.target.value)} placeholder="client@email.com" /></label>
                <label className="record-field"><span>Address</span><input value={form.address} onChange={(event) => change('address', event.target.value)} placeholder="Project or office address" /></label>
              </div>
            </section>
            <section className="record-form-section record-notes-section">
              <label className="record-field"><span>Notes <em>Optional</em></span><textarea value={form.notes} onChange={(event) => change('notes', event.target.value)} rows="3" placeholder="Preferences, site notes, or remarks" /></label>
            </section>
            <div className="record-form-actions">
              {editingId && <button type="button" className="secondary-action compact-action danger-action" disabled={isSaving} onClick={remove}><ActionIcon type="delete" /> Delete client</button>}
              <button type="submit" className="primary-action" disabled={isSaving}>{isSaving ? 'Saving...' : editingId ? 'Save client' : 'Add client'}</button>
            </div>
          </form>
        </ModalOverlay>
      )}
      {selectedClient && <ModalOverlay onClose={() => setSelectedClient(null)} portal sectionClass="client-documents-modal" sectionProps={{ 'aria-labelledby': 'client-documents-title' }}>
          <div className="modal-actions"><div><p className="eyebrow">Client workspace</p><h2 id="client-documents-title">{selectedClient.name}</h2><p>{[selectedClient.phone, selectedClient.email].filter(Boolean).join(' · ')}</p></div><IconButton icon="close" label="Close client documents" onClick={() => setSelectedClient(null)} /></div>
<div className="client-document-actions">
            <button type="button" className="primary-action compact-action" onClick={() => startNewDocument('quotation', 'client', selectedClient)}><ActionIcon type="quotation" /> New quotation</button>
            <button type="button" className="bill-primary-action compact-action" onClick={() => startNewDocument('bill', 'client', selectedClient)}><ActionIcon type="bill" /> New bill</button>
          </div>
          <p className="section-text">Documents linked to this client appear here. To link older documents, edit them and select this client.</p>
          {loadingDocuments ? <p role="status">Loading documents…</p> : documentError ? <p role="alert">{documentError}</p> : ['quotation', 'bill'].map((type) => <section className="client-document-group" key={type}><h3>{type === 'bill' ? 'Bills' : 'Quotations'} <small>({documents[type]?.length || 0})</small></h3>
            {!documents[type]?.length && <p className="section-text">No linked {type === 'bill' ? 'bills' : 'quotations'} yet.</p>}
            {documents[type]?.map((entry) => <article className="saved-quotation-card" key={entry.id}><div><strong>{entry.projectName}</strong><small>{entry.quoteDate} · {currency(entry.total)}</small><span className={`status-badge status-${entry.status || 'draft'}`}>{statusLabel(entry.status || 'draft')}{(entry.status || 'draft') !== 'cancelled' ? ` · ${statusLabel(entry.paymentStatus || 'unpaid')}` : ''}</span></div><div className="saved-actions"><IconButton icon="open" className="color-save" label={`Preview ${entry.projectName}`} onClick={() => openDocument(type, entry.id, true)} /><IconButton icon="edit" className="color-link" label={`Edit ${entry.projectName}`} onClick={() => openDocument(type, entry.id)} /></div></article>)}
</section>)}
        </ModalOverlay>}
    </ModalOverlay>
  );
}

export default Clients;
