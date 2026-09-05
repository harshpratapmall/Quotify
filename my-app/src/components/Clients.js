import { useCallback, useEffect, useState } from 'react';
import ActionIcon from './ActionIcon';
import { createClient, listClients, updateClient, updateClientStatus } from '../services/clients';

const emptyClient = { name: '', phone: '', email: '', address: '', notes: '' };

function Clients({ navigate }) {
  const [clients, setClients] = useState([]);
  const [form, setForm] = useState(emptyClient);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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
  };

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
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
    setMessage('');
  };

  const archive = async (client) => {
    const nextStatus = client.status === 'archived' ? 'active' : 'archived';
    const result = await updateClientStatus(client.id, nextStatus);
    setMessage(result.response.ok ? (nextStatus === 'archived' ? 'Client archived.' : 'Client restored.') : (result.data?.error || 'Unable to update client.'));
    if (result.response.ok) await refreshClients();
  };

  return (
    <main className="admin-page clients-page">
      <header className="admin-header">
        <div><p className="eyebrow">Workspace</p><h1>Clients</h1><p>Keep client details ready for every quotation and bill.</p></div>
        <button type="button" className="secondary-action" onClick={() => navigate('/')}>Back to overview</button>
      </header>
      <section className="admin-card client-editor-card">
        <div className="section-heading"><div><p className="eyebrow">Client record</p><h2>{editingId ? 'Edit client' : 'Add a client'}</h2></div>{editingId && <button type="button" className="secondary-action" onClick={resetForm}>Cancel</button>}</div>
        <form className="client-form" onSubmit={submit}>
          <label>Name<input value={form.name} onChange={(event) => change('name', event.target.value)} required /></label>
          <label>Phone<input type="tel" value={form.phone} onChange={(event) => change('phone', event.target.value)} /></label>
          <label>Email<input type="email" value={form.email} onChange={(event) => change('email', event.target.value)} /></label>
          <label>Address<input value={form.address} onChange={(event) => change('address', event.target.value)} /></label>
          <label className="full-width">Notes<textarea value={form.notes} onChange={(event) => change('notes', event.target.value)} rows="2" /></label>
          <button type="submit" className="primary-action" disabled={isSaving}>{isSaving ? 'Saving...' : editingId ? 'Save client' : 'Add client'}</button>
        </form>
      </section>
      <section className="admin-card">
        <div className="section-heading"><div><p className="eyebrow">Your records</p><h2>Client directory</h2></div><span className="client-count">{clients.length} {clients.length === 1 ? 'client' : 'clients'}</span></div>
        <input className="admin-search" aria-label="Search clients" placeholder="Search by name, phone, or email" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        <div className="admin-user-list">
          {clients.map((client) => <article className={`admin-user-row client-row ${client.status}`} key={client.id}><div><strong>{client.name}</strong><span>{client.phone || 'No phone'}{client.email ? ` · ${client.email}` : ''}</span>{client.address && <small>{client.address}</small>}</div><div className="saved-actions"><button type="button" className="secondary-action" onClick={() => edit(client)}><ActionIcon type="edit" /> Edit</button><button type="button" className="secondary-action" onClick={() => archive(client)}>{client.status === 'archived' ? 'Restore' : 'Archive'}</button></div></article>)}
        </div>
        {!clients.length && <p className="section-text">No clients match your search.</p>}
        {message && <p className="save-status" role="status">{message}</p>}
      </section>
    </main>
  );
}

export default Clients;