import { useCallback, useEffect, useState } from 'react';
import ActionIcon from './ActionIcon';
import IconButton from './IconButton';
import ModalOverlay from './ModalOverlay';
import SaveStatus from './SaveStatus';
import { APP_ROUTES } from '../config/routes';
import { createEmployee, deleteEmployee, listEmployees, updateEmployee } from '../services/employees';

const emptyEmployee = { name: '', phone: '', email: '', address: '', designation: '', notes: '' };

function Employees({ navigate }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyEmployee);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [message, setMessage] = useState('');

  const refreshEmployees = useCallback(async () => {
    const { response, data } = await listEmployees(searchTerm);
    if (!response.ok) {
      throw new Error(data?.error || 'Unable to load employees.');
    }
    setEmployees(Array.isArray(data) ? data : []);
  }, [searchTerm]);

  useEffect(() => {
    refreshEmployees().catch((error) => setMessage(error.message));
  }, [refreshEmployees]);

  const change = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const resetForm = () => {
    setForm(emptyEmployee);
    setEditingId(null);
    setShowAddEmployee(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      const result = editingId ? await updateEmployee(editingId, form) : await createEmployee(form);
      if (!result.response.ok) {
        setMessage(result.data?.error || 'Unable to save employee.');
        return;
      }
      setMessage(editingId ? 'Employee updated.' : 'Employee added.');
      resetForm();
      await refreshEmployees();
    } catch {
      setMessage('Unable to save employee.');
    } finally {
      setIsSaving(false);
    }
  };

  const edit = (employee) => {
    setEditingId(employee.id);
    setForm({ name: employee.name || '', phone: employee.phone || '', email: employee.email || '', address: employee.address || '', designation: employee.designation || '', notes: employee.notes || '' });
    setShowAddEmployee(true);
  };

  const remove = async (id) => {
    if (!id) return;
    if (!window.confirm('Delete this employee? This cannot be undone.')) return;
    setMessage('Deleting...');
    try {
      const result = await deleteEmployee(id);
      if (!result.response.ok) {
        setMessage(result.data?.error || 'Unable to delete employee.');
        return;
      }
      setMessage('Employee deleted.');
      resetForm();
      await refreshEmployees();
    } catch {
      setMessage('Unable to delete employee. Please try again.');
    }
  };

  return (
    <main className="admin-page employees-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Employees</h1>
          <p>Keep your team&apos;s contact details in one place.</p>
        </div>
        <div className="header-actions">
          <IconButton icon="plus" className="accent-icon" label="Add employee" onClick={() => { setEditingId(null); setForm(emptyEmployee); setShowAddEmployee(true); }} />
          <IconButton icon="back" label="Back to overview" onClick={() => navigate(APP_ROUTES.home)} />
        </div>
      </header>
      <SaveStatus message={message} className="admin-card" />

      <section className="admin-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your records</p>
            <h2>Employee directory</h2>
          </div>
          <span className="client-count">{employees.length} {employees.length === 1 ? 'employee' : 'employees'}</span>
        </div>
        <input className="admin-search" aria-label="Search employees" placeholder="Search by name, phone, or email" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        <div className="admin-user-list">
          {employees.map((employee) => (
            <article className="admin-user-row employee-row" key={employee.id}>
              <div>
                <strong>{employee.name}</strong>
                <span>{employee.phone || 'No phone'}{employee.email ? ` · ${employee.email}` : ''}</span>
                {employee.designation && <small className="employee-designation">{employee.designation}</small>}
                {employee.address && <small>{employee.address}</small>}
              </div>
              <div className="saved-actions">
                <IconButton icon="edit" className="color-link" label={`Edit ${employee.name}`} onClick={() => edit(employee)} />
                <IconButton icon="delete" className="danger-icon" label={`Delete ${employee.name}`} onClick={() => remove(employee.id)} />
              </div>
            </article>
          ))}
        </div>
        {!employees.length && <p className="section-text">No employees match your search.</p>}
      </section>

      {showAddEmployee && (
        <ModalOverlay onClose={() => resetForm()} sectionClass="modal-content admin-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Employee record</p>
              <h2>{editingId ? 'Edit employee' : 'Add an employee'}</h2>
            </div>
            <IconButton icon="close" label={editingId ? 'Cancel editing employee' : 'Close add employee'} onClick={resetForm} />
          </div>
          <form className="client-form" onSubmit={submit}>
            {message && <p role="status">{message}</p>}
            <label>Name<input value={form.name} onChange={(event) => change('name', event.target.value)} required /></label>
            <label>Phone<input type="tel" value={form.phone} onChange={(event) => change('phone', event.target.value)} /></label>
            <label>Email<input type="email" value={form.email} onChange={(event) => change('email', event.target.value)} /></label>
            <label>Designation<input value={form.designation} onChange={(event) => change('designation', event.target.value)} placeholder="e.g. Carpenter, Painter, Labour" /></label>
            <label>Address<input value={form.address} onChange={(event) => change('address', event.target.value)} /></label>
            <label className="full-width">Notes<textarea value={form.notes} onChange={(event) => change('notes', event.target.value)} rows="2" /></label>
            <div className="form-actions modal-form-actions">
              {editingId && <button type="button" className="secondary-action compact-action danger-action" disabled={isSaving} onClick={() => remove(editingId)}><ActionIcon type="delete" /> Delete employee</button>}
              <button type="submit" className="primary-action" disabled={isSaving}>{isSaving ? 'Saving...' : editingId ? 'Save employee' : 'Add employee'}</button>
            </div>
          </form>
        </ModalOverlay>
      )}
    </main>
  );
}

export default Employees;