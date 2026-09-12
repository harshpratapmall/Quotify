import { useCallback, useEffect, useState } from 'react';
import ActionIcon from './ActionIcon';
import IconButton from './IconButton';
import ModalOverlay from './ModalOverlay';
import SaveStatus from './SaveStatus';
import { APP_ROUTES } from '../config/routes';
import { createEmployee, deleteEmployee, listEmployees, updateEmployee } from '../services/employees';
import { buildEmployeeWhatsAppUrl, buildPhoneLink } from '../utils/whatsapp';

const emptyEmployee = { name: '', phone: '', email: '', address: '', designation: '', notes: '', status: 'active' };

function Employees({ navigate, pathname }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyEmployee);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
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

  const visibleEmployees = showInactive ? employees : employees.filter((employee) => employee.status !== 'inactive');

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
    setForm({ name: employee.name || '', phone: employee.phone || '', email: employee.email || '', address: employee.address || '', designation: employee.designation || '', notes: employee.notes || '', status: employee.status || 'active' });
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

  if (pathname !== APP_ROUTES.employees) return null;

  return (
    <ModalOverlay onClose={() => navigate(APP_ROUTES.home)} backdropClass="form-modal-backdrop" sectionClass="form-card form-workspace-modal" sectionProps={{ 'aria-labelledby': 'employees-title' }}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Employee Workspace</p>
          <h3 id="employees-title">Employees</h3>
        </div>
        <p className="section-text">Keep your team&apos;s contact details in one place.</p>
        <IconButton icon="close" className="workspace-close" label="Back to overview" onClick={() => navigate(APP_ROUTES.home)} />
      </div>
      <SaveStatus message={message} />

      <section className="admin-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your records</p>
            <h2>Employee directory</h2>
          </div>
          <div className="header-actions">
            <span className="client-count">{visibleEmployees.length} {visibleEmployees.length === 1 ? 'employee' : 'employees'}</span>
            <IconButton icon="plus" className="accent-icon" label="Add employee" onClick={() => { setEditingId(null); setForm(emptyEmployee); setShowAddEmployee(true); }} />
          </div>
        </div>
        <input className="admin-search" aria-label="Search employees" placeholder="Search by name, phone, or email" value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} />
        <label className="include-inactive"><input type="checkbox" checked={showInactive} onChange={(event) => setShowInactive(event.target.checked)} /> Include inactive employees</label>
        <div className="admin-user-list">
          {visibleEmployees.map((employee) => (
            <article className={`admin-user-row employee-row${employee.status === 'inactive' ? ' inactive' : ''}`} key={employee.id}>
              <div>
                <strong>{employee.name}</strong>
                <span>{employee.phone || 'No phone'}{employee.email ? ` · ${employee.email}` : ''}</span>
                {employee.designation && <small className="employee-designation">{employee.designation}</small>}
                {employee.address && <small>{employee.address}</small>}
                <small className={employee.status === 'inactive' ? 'employee-status employee-status-inactive' : 'employee-status'}>{employee.status === 'inactive' ? 'Inactive' : 'Active'}</small>
              </div>
              <div className="saved-actions">
                {employee.phone && employee.phone.replace(/\D/g, '') && <IconButton href={buildEmployeeWhatsAppUrl(employee.name, employee.phone)} className="color-link" icon="message" label={`WhatsApp ${employee.name}`} />}
                {employee.phone && employee.phone.replace(/\D/g, '') && <IconButton href={buildPhoneLink(employee.phone)} className="color-link" icon="phone" label={`Call ${employee.name}`} />}
                <IconButton icon="edit" className="color-link" label={`Edit ${employee.name}`} onClick={() => edit(employee)} />
                <IconButton icon="delete" className="danger-icon" label={`Delete ${employee.name}`} onClick={() => remove(employee.id)} />
              </div>
            </article>
          ))}
        </div>
        {!visibleEmployees.length && <p className="section-text">No employees match your search.</p>}
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
            <label>Status<select value={form.status} onChange={(event) => change('status', event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
            <label>Address<input value={form.address} onChange={(event) => change('address', event.target.value)} /></label>
            <label className="full-width">Notes<textarea value={form.notes} onChange={(event) => change('notes', event.target.value)} rows="2" /></label>
            <div className="form-actions modal-form-actions">
              {editingId && <button type="button" className="secondary-action compact-action danger-action" disabled={isSaving} onClick={() => remove(editingId)}><ActionIcon type="delete" /> Delete employee</button>}
              <button type="submit" className="primary-action" disabled={isSaving}>{isSaving ? 'Saving...' : editingId ? 'Save employee' : 'Add employee'}</button>
            </div>
          </form>
        </ModalOverlay>
      )}
    </ModalOverlay>
  );
}

export default Employees;