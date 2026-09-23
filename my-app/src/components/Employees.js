import { useCallback, useEffect, useState } from 'react';
import ActionIcon from './ActionIcon';
import IconButton from './IconButton';
import ModalOverlay from './ModalOverlay';
import SaveStatus from './SaveStatus';
import WorkspaceControls from './WorkspaceControls';
import { APP_ROUTES } from '../config/routes';
import { clearAttendance, createEmployee, deleteEmployee, fetchAttendanceRegister, fetchPayrollOverview, fetchPayrollRegister, listEmployees, saveAttendance, updateEmployee } from '../services/employees';
import { buildEmployeeWhatsAppUrl, buildPhoneLink } from '../utils/whatsapp';
import { downloadPayrollSummary } from '../utils/payrollPdf';

const emptyEmployee = { name: '', phone: '', email: '', address: '', designation: '', notes: '', status: 'active' };
const currentMonth = () => {
  const values = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit' }).formatToParts(new Date()).filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}`;
};
const currentDate = () => `${currentMonth()}-${new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', day: '2-digit' }).format(new Date())}`;
const attendanceStatuses = [['present', 'Present'], ['absent', 'Absent'], ['half_day', 'Half day'], ['paid_leave', 'Paid leave'], ['unpaid_leave', 'Unpaid leave']];
const monthDays = (period) => Array.from({ length: new Date(Date.UTC(Number(period.slice(0, 4)), Number(period.slice(5, 7)), 0)).getUTCDate() }, (_, index) => `${period}-${String(index + 1).padStart(2, '0')}`);
const dayLabel = (date) => new Intl.DateTimeFormat('en-IN', { day: 'numeric', weekday: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(`${date}T00:00:00Z`));

function Employees({ navigate, pathname }) {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyEmployee);
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [message, setMessage] = useState('');
  const [payrollOverview, setPayrollOverview] = useState(null);
  const [payrollPeriod, setPayrollPeriod] = useState(currentMonth);
  const [payrollRegister, setPayrollRegister] = useState(null);
  const [payrollFilter, setPayrollFilter] = useState('all');
  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [designationFilter, setDesignationFilter] = useState('all');
  const [activeTab, setActiveTab] = useState('directory');
  const [attendanceRegister, setAttendanceRegister] = useState(null);
  const [attendanceSaving, setAttendanceSaving] = useState('');
  const [attendanceDate, setAttendanceDate] = useState(currentDate);

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
  const refreshAttendance = useCallback(async () => {
    const { response, data } = await fetchAttendanceRegister(payrollPeriod);
    if (!response.ok) throw new Error(data?.error || 'Unable to load attendance.');
    setAttendanceRegister(data);
  }, [payrollPeriod]);
  useEffect(() => { fetchPayrollOverview(payrollPeriod).then(({ response, data }) => { if (response.ok) setPayrollOverview(data); else setMessage(data?.error || 'Unable to load payroll summary.'); }).catch(() => setMessage('Unable to load payroll summary.')); fetchPayrollRegister(payrollPeriod).then(({ response, data }) => { if (response.ok) setPayrollRegister(data); else setMessage(data?.error || 'Unable to load payroll register.'); }).catch(() => setMessage('Unable to load payroll register.')); refreshAttendance().catch((error) => setMessage(error.message)); }, [payrollPeriod, refreshAttendance]);

  const visibleEmployees = showInactive ? employees : employees.filter((employee) => employee.status !== 'inactive');
  const payrollRows = (payrollRegister?.employees || []).filter((row) => (
    (payrollFilter === 'all' || row.status === payrollFilter)
    && (employeeFilter === 'all' || row.employee.status === employeeFilter)
    && (designationFilter === 'all' || row.employee.designation === designationFilter)
  ));

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

  const updateAttendance = async (employeeId, date, status) => {
    const key = `${employeeId}-${date}`;
    setAttendanceSaving(key);
    const result = await saveAttendance(employeeId, date, status);
    setAttendanceSaving('');
    if (!result.response.ok) { setMessage(result.data?.error || 'Unable to save attendance.'); return; }
    await refreshAttendance();
  };

  const removeAttendance = async (employeeId, date) => {
    const key = `${employeeId}-${date}`;
    setAttendanceSaving(key);
    const result = await clearAttendance(employeeId, date);
    setAttendanceSaving('');
    if (!result.response.ok) { setMessage(result.data?.error || 'Unable to clear attendance.'); return; }
    await refreshAttendance();
  };

  if (pathname !== APP_ROUTES.employees) return null;

  return (
    <ModalOverlay onClose={() => navigate(APP_ROUTES.home)} backdropClass="form-modal-backdrop" sectionClass="form-card form-workspace-modal" sectionProps={{ 'aria-labelledby': 'employees-title' }}>
      <div className="section-heading">
        <div>
          <p className="eyebrow">Employee Workspace</p>
          <h3 id="employees-title">Employees</h3>
        </div>
        <p className="section-text">Manage your team, monthly salary payments, advances, and dues.</p>
        <WorkspaceControls className="workspace-actions" actions={[
          { type: 'plus', label: 'Add employee', onClick: () => { setEditingId(null); setForm(emptyEmployee); setShowAddEmployee(true); } },
          { type: 'close', label: 'Close employee workspace', onClick: () => navigate(APP_ROUTES.home) },
        ]} />
      </div>
      <SaveStatus message={message} />

      <div className="employee-workspace-tabs" role="tablist" aria-label="Employee workspace sections">
        {[['directory', 'Directory'], ['payroll', 'Payroll'], ['attendance', 'Attendance']].map(([tab, label]) => <button type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)} key={tab}>{label}</button>)}
      </div>

      {activeTab === 'payroll' && <>
        <section className="employee-kpi-grid" aria-label="Current month payroll summary"><article><span>Active team</span><strong>{payrollOverview?.activeHeadcount ?? '—'}</strong></article><article><span>Salary due</span><strong>Rs. {Number(payrollOverview?.totalDue || 0).toLocaleString('en-IN')}</strong></article><article><span>Paid</span><strong>Rs. {Number(payrollOverview?.paid || 0).toLocaleString('en-IN')}</strong></article><article><span>Balance</span><strong>Rs. {Number(payrollOverview?.balance || 0).toLocaleString('en-IN')}</strong></article></section>
        <section className="admin-card payroll-register-card">
        <div className="section-heading payroll-register-heading">
          <div>
            <p className="eyebrow">Monthly payroll</p>
            <h2>Payroll register</h2>
          </div>
          <button className="secondary-action compact-action payroll-download" onClick={() => payrollRegister && downloadPayrollSummary({ ...payrollRegister, employees: payrollRows })} disabled={!payrollRegister}>Download summary</button>
        </div>
        <div className="payroll-register-filters" aria-label="Payroll register filters">
          <label className="payroll-filter-month"><span>Month</span><input type="month" value={payrollPeriod} onChange={(event) => setPayrollPeriod(event.target.value)} /></label>
          <label><span>Payment status</span><select value={payrollFilter} onChange={(event) => setPayrollFilter(event.target.value)}><option value="all">All statuses</option><option value="unpaid">Unpaid</option><option value="partially_paid">Partially paid</option><option value="paid">Paid</option><option value="not_started">Not started</option></select></label>
          <label><span>Employment status</span><select value={employeeFilter} onChange={(event) => setEmployeeFilter(event.target.value)}><option value="all">All employees</option><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
          <label><span>Designation</span><select value={designationFilter} onChange={(event) => setDesignationFilter(event.target.value)}><option value="all">All designations</option>{[...new Set((payrollRegister?.employees || []).map((row) => row.employee.designation).filter(Boolean))].map((designation) => <option key={designation} value={designation}>{designation}</option>)}</select></label>
        </div>
        <div className="payroll-entry-list">
          {payrollRows.map((row) => <article key={row.employee.id}>
            <div className="payroll-entry-identity"><strong>{row.employee.name}</strong><span>{row.employee.designation || 'Employee'}</span></div>
            <span className={`payroll-status ${row.status}`}>{row.status.replaceAll('_', ' ')}</span>
            <div className="payroll-entry-balance"><span>Balance due</span><b>Rs. {Number(row.balance || 0).toLocaleString('en-IN')}</b></div>
            <IconButton icon="open" className="color-link" label={`Open ${row.employee.name} payroll`} onClick={() => navigate(APP_ROUTES.employeeProfile(row.employee.id))} />
          </article>)}
        </div>
        {!payrollRows.length && <p className="section-text">No payroll records match these filters for this month.</p>}
        </section>
      </>}

      {activeTab === 'directory' && <section className="admin-card employee-directory-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your records</p>
            <h2>Employee directory</h2>
          </div>
          <div className="header-actions">
            <span className="client-count">{visibleEmployees.length} {visibleEmployees.length === 1 ? 'employee' : 'employees'}</span>
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
              <div className="employee-row-actions">
                <IconButton icon="open" className="color-link" label={`Open ${employee.name} payroll`} onClick={() => navigate(APP_ROUTES.employeeProfile(employee.id))} />
                {employee.phone && employee.phone.replace(/\D/g, '') && <IconButton href={buildEmployeeWhatsAppUrl(employee.name, employee.phone)} className="color-link" icon="message" label={`WhatsApp ${employee.name}`} />}
                {employee.phone && employee.phone.replace(/\D/g, '') && <IconButton href={buildPhoneLink(employee.phone)} className="color-link" icon="phone" label={`Call ${employee.name}`} />}
                <IconButton icon="edit" className="color-link" label={`Edit ${employee.name}`} onClick={() => edit(employee)} />
                <IconButton icon="delete" className="danger-icon" label={`Delete ${employee.name}`} onClick={() => remove(employee.id)} />
              </div>
            </article>
          ))}
        </div>
        {!visibleEmployees.length && <p className="section-text">No employees match your search.</p>}
      </section>}

      {activeTab === 'attendance' && <section className="admin-card attendance-register-card">
        <div className="section-heading attendance-register-heading">
          <div><p className="eyebrow">Daily attendance</p><h2>Monthly register</h2><p className="section-text">Mark today or correct either of the previous two days. Attendance does not change payroll.</p></div>
          <div className="attendance-period-controls"><label className="attendance-month"><span>Month</span><input type="month" value={payrollPeriod} onChange={(event) => { setPayrollPeriod(event.target.value); setAttendanceDate(`${event.target.value}-01`); }} /></label><label className="attendance-date"><span>Focus day</span><input type="date" min={`${payrollPeriod}-01`} max={`${payrollPeriod}-${String(monthDays(payrollPeriod).length).padStart(2, '0')}`} value={attendanceDate} onChange={(event) => setAttendanceDate(event.target.value)} /></label></div>
        </div>
        <div className="attendance-legend" aria-label="Attendance status legend">{attendanceStatuses.map(([status, label]) => <span className={`attendance-status ${status}`} key={status}>{label}</span>)}</div>
        <div className="attendance-register-scroll">
          <div className="attendance-register-table">
            <div className="attendance-register-head"><strong>Employee</strong>{monthDays(payrollPeriod).map((date) => <span className={date === attendanceDate ? 'selected-date' : ''} key={date}>{dayLabel(date)}</span>)}</div>
            {(attendanceRegister?.employees || []).map((row) => {
              const records = Object.fromEntries((row.records || []).map((record) => [record.attendanceDate, record]));
              return <article className="attendance-register-row" key={row.employee.id}>
                <div className="attendance-employee"><strong>{row.employee.name}</strong><span>{row.employee.designation || 'Employee'} · {row.counts.present || 0} present</span></div>
                {monthDays(payrollPeriod).map((date) => {
                  const record = records[date];
                  const editable = date >= (attendanceRegister?.editableFrom || '') && date <= (attendanceRegister?.editableThrough || '');
                  const saving = attendanceSaving === `${row.employee.id}-${date}`;
                  return <div className={`attendance-day${date === attendanceDate ? ' selected-date' : ''}`} key={date}>
                    {editable ? <select aria-label={`${row.employee.name} attendance for ${date}`} value={record?.status || ''} disabled={saving} onChange={(event) => event.target.value ? updateAttendance(row.employee.id, date, event.target.value) : removeAttendance(row.employee.id, date)}><option value="">—</option>{attendanceStatuses.map(([status, label]) => <option value={status} key={status}>{label}</option>)}</select> : <span className={record ? `attendance-status ${record.status}` : 'attendance-empty'} title={record?.status || 'Not recorded'}>{record ? record.status.replaceAll('_', ' ') : '—'}</span>}
                  </div>;
                })}
              </article>;
            })}
          </div>
        </div>
        {!(attendanceRegister?.employees || []).length && <p className="section-text">No active employees are available for attendance.</p>}
      </section>}

      {showAddEmployee && (
        <ModalOverlay onClose={() => resetForm()} portal sectionClass="record-form-modal employee-record-modal" sectionProps={{ 'aria-labelledby': 'employee-form-title' }}>
          <div className="record-form-header">
            <div className="record-form-heading">
              <span className="record-form-icon"><ActionIcon type="profile" /></span>
              <div>
                <p className="eyebrow">Employee record</p>
                <h2 id="employee-form-title">{editingId ? 'Edit employee' : 'Add an employee'}</h2>
                <p className="record-form-description">Keep your team&apos;s contact and work details together.</p>
              </div>
            </div>
            <IconButton icon="close" className="modal-close" label={editingId ? 'Cancel editing employee' : 'Close add employee'} onClick={resetForm} />
          </div>
          <form className="record-form" onSubmit={submit}>
            <SaveStatus message={message} className="record-form-status" />
            <section className="record-form-section" aria-labelledby="employee-contact-title">
              <div className="record-form-section-heading">
                <p className="eyebrow">Employee details</p>
                <span id="employee-contact-title">Name is required</span>
              </div>
              <div className="record-form-grid">
                <label className="record-field"><span>Name <b>Required</b></span><input value={form.name} onChange={(event) => change('name', event.target.value)} placeholder="Employee name" required /></label>
                <label className="record-field"><span>Designation</span><input value={form.designation} onChange={(event) => change('designation', event.target.value)} placeholder="e.g. Carpenter, Painter, Labour" /></label>
                <label className="record-field"><span>Phone</span><input type="tel" value={form.phone} onChange={(event) => change('phone', event.target.value)} placeholder="+91 98765 43210" /></label>
                <label className="record-field"><span>Email</span><input type="email" value={form.email} onChange={(event) => change('email', event.target.value)} placeholder="employee@email.com" /></label>
                <label className="record-field"><span>Status</span><select value={form.status} onChange={(event) => change('status', event.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></label>
                <label className="record-field"><span>Address</span><input value={form.address} onChange={(event) => change('address', event.target.value)} placeholder="Work address" /></label>
              </div>
            </section>
            <section className="record-form-section record-notes-section">
              <label className="record-field"><span>Notes <em>Optional</em></span><textarea value={form.notes} onChange={(event) => change('notes', event.target.value)} rows="3" placeholder="Skills or remarks" /></label>
            </section>
            <div className="record-form-actions">
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
