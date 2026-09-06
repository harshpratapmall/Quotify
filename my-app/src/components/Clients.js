import { useCallback, useEffect, useState } from 'react';
import ActionIcon from './ActionIcon';
import { createClient, listClients, updateClient, updateClientStatus } from '../services/clients';

const emptyClient = { name: '', phone: '', email: '', address: '', notes: '' };

function Clients({ navigate }) {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyClient);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);

  const refreshClients = useCallback(async () => {
    const { response, data } = await listClients(searchTerm);
    if (!response.ok) {
      throw new Error(data?.error || 'Unable to load clients.');
    }
    setClients(Array.isArray(data) ? data : []);
  }, [searchTerm]);

  useEffect(() => {
    refreshClients().catch((error) => console.error(error.message));
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
        alert(result.data?.error || 'Unable to save client.');
        return;
      }
      alert(editingId ? 'Client updated.' : 'Client added.');
      resetForm();
      await refreshClients();
    } catch {
      alert('Unable to save client.');
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
    const nextStatus = client.status === 'archived' ? 'active' : 'archived';
    const result = await updateClientStatus(client.id, nextStatus);
    if (result.response.ok) {
      alert(nextStatus === 'archived' ? 'Client archived.' : 'Client restored.');
      await refreshClients();
    } else {
      alert(result.data?.error || 'Unable to update client.');
    }
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
          <button type="button" className="icon-button" onClick={() => { setEditingId(null); setForm(emptyClient); setShowAddClient(true); }} aria-label="Add client">
            <ActionIcon type="plus" />
          </button>
          <button type="button" className="icon-button" onClick={() => navigate('/')} aria-label="Back to overview">
            <ActionIcon type="back" />
          </button>
        </div>
      </header>

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
                <strong>{client.name}</strong>
                <span>{client.phone || 'No phone'}{client.email ? ` · ${client.email}` : ''}</span>
                {client.address && <small>{client.address}</small>}
              </div>
              <div className="saved-actions">
                <button type="button" className="secondary-action" onClick={() => edit(client)}>
                  <ActionIcon type="edit" /> Edit
                </button>
                <button type="button" className="secondary-action" onClick={() => archive(client)}>
                  {client.status === 'archived' ? 'Restore' : 'Archive'}
                </button>
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
              {editingId && <button type="button" className="secondary-action" onClick={resetForm}>Cancel</button>}
            </div>
            <form className="client-form" onSubmit={submit}>
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
    </main>
  );
}

export default Clients;