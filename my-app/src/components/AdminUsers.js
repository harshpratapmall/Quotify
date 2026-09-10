import { useCallback, useEffect, useState } from 'react';
import ActionIcon from './ActionIcon';
import IconButton from './IconButton';
import { createUser, listUsers, resetUserPassword, updateUserStatus } from '../services/admin';

function AdminUsers({ navigate, currentUser, logout }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ username: '', displayName: '', password: '' });
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [pendingUser, setPendingUser] = useState(null);

  const refreshUsers = useCallback(async () => {
    const nextUsers = await listUsers();
    setUsers(nextUsers);
  }, []);

  useEffect(() => {
    refreshUsers().catch(() => setMessage('Unable to load users.'));
  }, [refreshUsers]);

  const submitCreate = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setMessage('');
    try {
      const { response, data } = await createUser(form);
      if (!response.ok) {
        setMessage(data?.error || 'Unable to create user.');
        return;
      }
      setForm({ username: '', displayName: '', password: '' });
      setMessage('User created.');
      await refreshUsers();
    } catch {
      setMessage('Unable to create user.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (user) => {
    setPendingUser(user.id);
    setMessage('');
    try {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    const { response, data } = await updateUserStatus(user.id, nextStatus);
    setMessage(response.ok ? 'User status updated.' : (data?.error || 'Unable to update user status.'));
    if (response.ok) await refreshUsers();
    } catch { setMessage('Unable to update user status. Please try again.'); }
    finally { setPendingUser(null); }
  };

  const resetPassword = async (user) => {
    const password = window.prompt(`Enter a new password for ${user.username}:`);
    if (!password) return;
    const { response, data } = await resetUserPassword(user.id, password);
    setMessage(response.ok ? 'Password reset.' : (data?.error || 'Unable to reset password.'));
  };

  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const visibleUsers = users.filter((user) => [user.username, user.displayName, user.role, user.status]
    .some((value) => value?.toLowerCase().includes(normalizedSearchTerm)));

  return (
    <main className="admin-page user-management-page">
      <header className="admin-header">
        <div><p className="eyebrow">Administration</p><h1>User management</h1><p>Signed in as {currentUser.displayName || currentUser.username}.</p></div>
        <div className="header-actions"><IconButton icon="back" label="Back to overview" onClick={() => navigate('/')} /><IconButton icon="logout" label="Log out" onClick={logout} /></div>
      </header>
      <section className="admin-summary" aria-label="User summary"><article><span>Total users</span><strong>{users.length}</strong></article><article><span>Active</span><strong>{users.filter((user) => user.status === 'active').length}</strong></article><article><span>Inactive</span><strong>{users.filter((user) => user.status === 'inactive').length}</strong></article></section>
      <section className="admin-card">
        <h2>Create user</h2>
        <form className="admin-form" onSubmit={submitCreate}>
          <input aria-label="Username" placeholder="Username" value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} required />
          <input aria-label="Display name" placeholder="Display name" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} required />
          <input aria-label="Temporary password" type="password" minLength={8} placeholder="Temporary password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
          <button type="submit" className="primary-action" disabled={isSaving}>{isSaving ? 'Creating...' : 'Create user'}</button>
        </form>
      </section>
      <section className="admin-card">
        <h2>Users</h2>
        <input className="admin-search" aria-label="Search users" placeholder="Search by name, username, role, or status" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        <div className="admin-user-list">
          {visibleUsers.map((user) => (
            <article className="admin-user-row" key={user.id}>
              <div><strong>{user.displayName || user.username}</strong><span>{user.username} · {user.role} · {user.status}</span></div>
              <div className="saved-actions">
                <button type="button" className="secondary-action compact-action" title={user.id === currentUser.id ? 'You cannot deactivate your own account' : undefined} onClick={() => toggleStatus(user)} disabled={user.id === currentUser.id || pendingUser !== null}><ActionIcon type="power" />{pendingUser === user.id ? 'Updating…' : user.status === 'active' ? 'Deactivate' : 'Activate'}</button>
                <button type="button" className="secondary-action compact-action" onClick={() => resetPassword(user)}>Reset password</button>
              </div>
            </article>
          ))}
        </div>
        {visibleUsers.length === 0 && <p className="section-text">No users match your search.</p>}
        {message && <p className="save-status" role="status">{message}</p>}
      </section>
    </main>
  );
}

export default AdminUsers;
