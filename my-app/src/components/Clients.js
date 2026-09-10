import { useCallback, useEffect, useState } from 'react';
import ActionIcon from './ActionIcon';
import IconButton from './IconButton';
import { statusLabel } from '../config/statuses';
import { currency } from '../utils/formatters';
import { createClient, listClients, listClientDocuments, updateClient, updateClientStatus } from '../services/clients';

const emptyClient = { name: '', phone: '', email: '', address: '', notes: '' };

function Clients({ navigate, startNewDocument, openDocument }) {
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
  const [archiveBusy, setArchiveBusy] = useState(false);

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

  const archive = async (client) => {
    setArchiveBusy(true);
    try {
    const nextStatus = client.status === 'archived' ? 'active' : 'archived';
    const result = await updateClientStatus(client.id, nextStatus);
    if (result.response.ok) {
      setMessage(nextStatus === 'archived' ? 'Client archived.' : 'Client restored.');
      await refreshClients();
    } else {
      setMessage(result.data?.error || 'Unable to update client.');
    }
    } catch { setMessage('Unable to update client. Please try again.'); }
    finally { setArchiveBusy(false); }
  };

  return (
    <main className="admin-page clients-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Clients</h1>
          <p>Keep client details ready for every quotation and bill.</p>
        </div>
        <div className="header-actions">
          <IconButton icon="plus" className="accent-icon" label="Add client" onClick={() => { setEditingId(null); setForm(emptyClient); setShowAddClient(true); }} />
          <IconButton icon="back" label="Back to overview" onClick={() => navigate('/')} />
        </div>
      </header>
      {message && <p className="admin-card save-status" role="status">{message}</p>}

      <section className="admin-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your records</p>
            <h2>Client directory</h2>
          </div>
          <span className="client-count">{clients.length} {clients.length === 1 ? 'client' : 'clients'}</span>
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
                <IconButton icon="library" label={`Documents for ${client.name}`} onClick={() => setSelectedClient(client)} />
                <IconButton icon="edit" label={`Edit ${client.name}`} onClick={() => edit(client)} />
                <IconButton icon={client.status === 'archived' ? 'restore' : 'archive'} label={`${client.status === 'archived' ? 'Restore' : 'Archive'} ${client.name}`} disabled={archiveBusy} onClick={() => archive(client)} />
              </div>
            </article>
          ))}
        </div>
        {!clients.length && <p className="section-text">No clients match your search.</p>}
      </section>

      {showAddClient && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => resetForm()}>
          <section className="modal-content admin-card" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <div className="section-heading">
              <div>
                <p className="eyebrow">Client record</p>
                <h2>{editingId ? 'Edit client' : 'Add a client'}</h2>
              </div>
              <IconButton icon="close" label={editingId ? 'Cancel editing client' : 'Close add client'} onClick={resetForm} />
            </div>
            <form className="client-form" onSubmit={submit}>
              {message && <p role="status">{message}</p>}
              <label>Name<input value={form.name} onChange={(event) => change('name', event.target.value)} required /></label>
              <label>Phone<input type="tel" value={form.phone} onChange={(event) => change('phone', event.target.value)} /></label>
              <label>Email<input type="email" value={form.email} onChange={(event) => change('email', event.target.value)} /></label>
              <label>Address<input value={form.address} onChange={(event) => change('address', event.target.value)} /></label>
              <label className="full-width">Notes<textarea value={form.notes} onChange={(event) => change('notes', event.target.value)} rows="2" /></label>
              <button type="submit" className="primary-action" disabled={isSaving}>{isSaving ? 'Saving...' : editingId ? 'Save client' : 'Add client'}</button>
            </form>
          </section>
        </div>
      )}
      {selectedClient && <div className="modal-backdrop" onMouseDown={() => setSelectedClient(null)}>
        <section className="client-documents-modal" role="dialog" aria-modal="true" aria-labelledby="client-documents-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-actions"><div><p className="eyebrow">Client workspace</p><h2 id="client-documents-title">{selectedClient.name}</h2><p>{[selectedClient.phone, selectedClient.email].filter(Boolean).join(' · ')}</p></div><IconButton icon="close" label="Close client documents" onClick={() => setSelectedClient(null)} /></div>
          <div className="client-document-actions">
            <button type="button" className="primary-action compact-action" disabled={selectedClient.status === 'archived'} onClick={() => startNewDocument('quotation', 'client', selectedClient)}><ActionIcon type="quotation" /> New quotation</button>
            <button type="button" className="bill-primary-action compact-action" disabled={selectedClient.status === 'archived'} onClick={() => startNewDocument('bill', 'client', selectedClient)}><ActionIcon type="bill" /> New bill</button>
          </div>
          {selectedClient.status === 'archived' && <p>Restore this client to create new documents.</p>}
          <p className="section-text">Documents linked to this client appear here. To link older documents, edit them and select this client.</p>
          {loadingDocuments ? <p role="status">Loading documents…</p> : documentError ? <p role="alert">{documentError}</p> : ['quotation', 'bill'].map((type) => <section className="client-document-group" key={type}><h3>{type === 'bill' ? 'Bills' : 'Quotations'} <small>({documents[type]?.length || 0})</small></h3>
            {!documents[type]?.length && <p className="section-text">No linked {type === 'bill' ? 'bills' : 'quotations'} yet.</p>}
            {documents[type]?.map((entry) => <article className="saved-quotation-card" key={entry.id}><div><strong>{entry.projectName}</strong><small>{entry.quoteDate} · {currency(entry.total)}</small><span className={`status-badge status-${entry.status || 'draft'}`}>{statusLabel(entry.status || 'draft')}{type === 'bill' ? ` · ${statusLabel(entry.paymentStatus || 'unpaid')}` : ''}</span></div><div className="saved-actions"><IconButton icon="open" label={`Preview ${entry.projectName}`} onClick={() => openDocument(type, entry.id, true)} /><IconButton icon="edit" label={`Edit ${entry.projectName}`} onClick={() => openDocument(type, entry.id)} /></div></article>)}
          </section>)}
        </section>
      </div>}
    </main>
  );
}

export default Clients;
