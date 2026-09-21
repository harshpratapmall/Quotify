import { useCallback, useEffect, useMemo, useState } from 'react';
import IconButton from './IconButton';
import SaveStatus from './SaveStatus';
import WorkspaceControls from './WorkspaceControls';
import { APP_ROUTES } from '../config/routes';
import { createPayrollEntry, deletePayrollEntry, fetchEmployeePayroll, fetchPayslip, finalizePayroll, reopenPayroll, saveEmployeePayroll, updatePayrollEntry } from '../services/employees';
import { downloadPayslip } from '../utils/payrollPdf';

const indiaDateParts = () => Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).filter(({ type }) => type !== 'literal').map(({ type, value }) => [type, value]));
const monthNow = () => { const value = indiaDateParts(); return `${value.year}-${value.month}`; };
const dayNow = () => { const value = indiaDateParts(); return `${value.year}-${value.month}-${value.day}`; };
const money = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const entryTypes = ['credit', 'deduction', 'advance', 'payment'];

function EmployeeProfile({ pathname, navigate }) {
  const employeeId = pathname.startsWith('/employees/') ? pathname.split('/')[2] : '';
  const [data, setData] = useState(null);
  const [period, setPeriod] = useState(monthNow);
  const [salary, setSalary] = useState('');
  const [entry, setEntry] = useState({ type: 'payment', amount: '', entryDate: dayNow(), label: '', note: '', recoveryPeriod: monthNow() });
  const [message, setMessage] = useState('');
  const [editingEntryId, setEditingEntryId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const refresh = useCallback(async () => { const { response, data: payload } = await fetchEmployeePayroll(employeeId); if (!response.ok) throw new Error(payload?.error || 'Unable to load employee payroll.'); setData(payload); }, [employeeId]);
  useEffect(() => { if (employeeId) refresh().catch((error) => setMessage(error.message)); }, [employeeId, refresh]);
  const current = useMemo(() => data?.payroll?.find((item) => item.period === period), [data, period]);
  useEffect(() => setSalary(current ? String(current.baseSalary ?? '') : ''), [current]);
  if (!employeeId) return null;
  const changeFinalization = async (finalize) => { setIsSaving(true); const result = finalize ? await finalizePayroll(employeeId, period) : await reopenPayroll(employeeId, period); setIsSaving(false); if (!result.response.ok) { setMessage(result.data?.error || 'Unable to update payroll state.'); return; } setMessage(finalize ? 'Payroll month finalized.' : 'Payroll month reopened.'); await refresh(); };
  const download = async () => { const result = await fetchPayslip(employeeId, period); if (!result.response.ok) { setMessage(result.data?.error || 'Set the salary month before downloading its payslip.'); return; } await downloadPayslip(result.data); };
  const submitSalary = async (event) => { event.preventDefault(); const { response, data: payload } = await saveEmployeePayroll(employeeId, { period, baseSalary: Number(salary) }); if (!response.ok) { setMessage(payload?.error || 'Unable to save salary.'); return; } setMessage('Salary month saved.'); await refresh(); };
  const submitEntry = async (event) => { event.preventDefault(); const payload = { ...entry, period: entry.period || period, amount: Number(entry.amount), recoveryPeriod: entry.type === 'advance' ? entry.recoveryPeriod : '' }; const result = editingEntryId ? await updatePayrollEntry(employeeId, editingEntryId, payload) : await createPayrollEntry(employeeId, payload); if (!result.response.ok) { setMessage(result.data?.error || 'Unable to save entry.'); return; } setMessage(editingEntryId ? 'Payroll entry updated.' : 'Payroll entry saved.'); setEditingEntryId(''); setEntry((currentEntry) => ({ ...currentEntry, period: '', amount: '', label: '', note: '' })); await refresh(); };
  const removeEntry = async (id) => { if (!window.confirm('Delete this payroll entry?')) return; const result = await deletePayrollEntry(employeeId, id); if (!result.response.ok) { setMessage(result.data?.error || 'Unable to delete entry.'); return; } setMessage('Payroll entry deleted.'); await refresh(); };
  return <main className="employee-profile-page page-content">
    <header className="employee-profile-header">
      <div><p className="eyebrow">Employee payroll</p><h1>{data?.employee?.name || 'Employee profile'}</h1><p>{data?.employee?.designation || 'Employee'} · {data?.employee?.status === 'inactive' ? 'Inactive' : 'Active'}</p></div>
      <WorkspaceControls actions={[{ type: 'back', label: 'Back to employees', onClick: () => navigate(APP_ROUTES.employees) }, { type: 'close', label: 'Close employee profile', onClick: () => navigate(APP_ROUTES.home) }]} />
    </header>
    <SaveStatus message={message} />
    <section className="payroll-toolbar"><label>Salary month<input type="month" value={period} onChange={(event) => setPeriod(event.target.value)} /></label><span>{data?.employee?.phone || 'No phone'}{data?.employee?.email ? ` · ${data.employee.email}` : ''}</span><div className="saved-actions"><button className="secondary-action compact-action" onClick={download} disabled={!current}>Download payslip</button>{current?.state === 'finalized' ? <button className="secondary-action compact-action" onClick={() => changeFinalization(false)} disabled={isSaving}>Reopen month</button> : <button className="primary-action compact-action" onClick={() => changeFinalization(true)} disabled={!current || isSaving}>Finalize month</button>}</div></section>
    <section className="payroll-summary-grid">
      <article><span>Salary due</span><strong>{money(current?.totalDue)}</strong></article><article><span>Amount paid</span><strong>{money(current?.paid)}</strong></article><article><span>Balance due</span><strong>{money(current?.balance)}</strong></article><article><span>Status</span><strong className={`payroll-status ${current?.status || 'unpaid'}`}>{(current?.status || 'not started').replaceAll('_', ' ')}</strong></article>
    </section>
    <div className="employee-payroll-layout">
      <section className="admin-card"><div className="section-heading"><div><p className="eyebrow">Monthly salary</p><h2>{period}</h2></div></div><form className="payroll-form" onSubmit={submitSalary}><label>Base salary<input type="number" min="0" step="0.01" value={salary} onChange={(event) => setSalary(event.target.value)} required disabled={current?.state === 'finalized'} /></label><button className="primary-action" disabled={current?.state === 'finalized'}>Save salary</button></form><div className="payroll-breakdown"><span>Base salary <b>{money(current?.baseSalary)}</b></span><span>Credits <b>{money(current?.credits)}</b></span><span>Deductions <b>{money(current?.deductions)}</b></span><span>Advance recovery <b>{money(current?.advances)}</b></span></div></section>
      <section className="admin-card"><div className="section-heading"><div><p className="eyebrow">{editingEntryId ? 'Edit entry' : 'Add entry'}</p><h2>Payments and adjustments</h2></div></div><form className="payroll-entry-form" onSubmit={submitEntry}><label>Type<select value={entry.type} onChange={(event) => setEntry({ ...entry, type: event.target.value })}>{entryTypes.map((type) => <option key={type} value={type}>{type}</option>)}</select></label><label>Amount<input type="number" min="0.01" step="0.01" value={entry.amount} onChange={(event) => setEntry({ ...entry, amount: event.target.value })} required /></label><label>Date<input type="date" value={entry.entryDate} onChange={(event) => setEntry({ ...entry, entryDate: event.target.value })} required /></label>{entry.type === 'advance' && <label>Recovery month<input type="month" value={entry.recoveryPeriod} onChange={(event) => setEntry({ ...entry, recoveryPeriod: event.target.value })} required /></label>}<label>Label<input value={entry.label} onChange={(event) => setEntry({ ...entry, label: event.target.value })} placeholder="Bonus, absence, cash payment..." /></label><button className="secondary-action compact-action">{editingEntryId ? 'Save entry' : 'Add entry'}</button></form></section>
    </div>
    <section className="admin-card"><div className="section-heading"><div><p className="eyebrow">History</p><h2>Salary entries</h2></div></div><div className="payroll-entry-list">{(data?.entries || []).filter((item) => item.period === period || (item.type === 'advance' && item.recoveryPeriod === period)).map((item) => <article key={item.id}><div><strong>{item.label || item.type}</strong><span>{item.entryDate}{item.type === 'advance' && ` · recover in ${item.recoveryPeriod}`}</span></div><b>{money(item.amount)}</b><div className="saved-actions"><IconButton icon="edit" className="color-link" label={`Edit ${item.type}`} onClick={() => { setEditingEntryId(item.id); setEntry({ period: item.period, type: item.type, amount: String(item.amount), entryDate: item.entryDate, label: item.label || '', note: item.note || '', recoveryPeriod: item.recoveryPeriod || period }); }} /><IconButton icon="delete" className="danger-icon" label={`Delete ${item.type}`} onClick={() => removeEntry(item.id)} /></div></article>)}</div>{!current && <p className="section-text">Set the base salary for this month to begin payroll.</p>}</section>
    <section className="admin-card"><div className="section-heading"><div><p className="eyebrow">Audit trail</p><h2>Payroll activity</h2></div></div><div className="payroll-entry-list">{(data?.activity || []).slice(0, 12).map((item) => <article key={item.id}><div><strong>{item.action.replaceAll('_', ' ')}</strong><span>{item.occurredAt ? new Date(item.occurredAt).toLocaleString('en-IN') : ''}{item.detail ? ` · ${item.detail}` : ''}</span></div></article>)}</div>{!(data?.activity || []).length && <p className="section-text">Changes to payroll will appear here.</p>}</section>
  </main>;
}
export default EmployeeProfile;
