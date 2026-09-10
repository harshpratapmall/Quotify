import { useEffect, useState } from 'react';
import { listClients } from '../services/clients';

export default function ClientSelector({ clientId, onSelect }) {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    listClients().then(({ response, data }) => {
      if (!response.ok) throw new Error('Unable to load clients. You can still enter details manually.');
      if (active) setClients(Array.isArray(data) ? data : []);
    }).catch(() => active && setError('Unable to load clients. You can still enter details manually.'));
    return () => { active = false; };
  }, []);
  return <div className="client-selector">
    <label>Existing client<select value={clientId || ''} onChange={(event) => onSelect(clients.find((client) => client.id === event.target.value) || null)}>
      <option value="">Enter manually / no client link</option>
      {clientId && !clients.some((client) => client.id === clientId) && <option value={clientId}>Linked client</option>}
      {clients.filter((client) => client.status !== 'archived' || client.id === clientId).map((client) => <option key={client.id} value={client.id}>{client.name}{client.phone || client.email ? ` — ${client.phone || client.email}` : ''}{client.status === 'archived' ? ' (archived)' : ''}</option>)}
    </select></label>
    <small>{error || 'Selecting a client fills their name, phone, email, and address. Project details remain editable.'}</small>
  </div>;
}
