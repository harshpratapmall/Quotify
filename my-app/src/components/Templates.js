import { useCallback, useEffect, useState } from 'react';
import { createTemplate, deleteTemplate, listTemplates, updateTemplate } from '../services/templates';
import ActionIcon from './ActionIcon';

const emptyTemplate = { name: '', documentType: 'quotation', primaryColor: '#19334c', secondaryColor: '#315f83', accentColor: '#bd7156', terms: '', footer: '', logoUrl: '', isDefault: false };

function Templates({ navigate, isPopup = false, onClose }) {
  const [templates, setTemplates] = useState([]);
  const [form, setForm] = useState(emptyTemplate);
  const [editingId, setEditingId] = useState(null);

  const refresh = useCallback(async () => {
    const { response, data } = await listTemplates();
    if (!response.ok) throw new Error(data?.error || 'Unable to load templates.');
    setTemplates(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => { refresh().catch((error) => console.error(error.message)); }, [refresh]);
  const change = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const reset = () => { setForm(emptyTemplate); setEditingId(null); };
  const submit = async (event) => {
    event.preventDefault();
    const result = editingId ? await updateTemplate(editingId, form) : await createTemplate(form);
    if (!result.response.ok) { alert(result.data?.error || 'Unable to save template.'); return; }
    alert(editingId ? 'Template updated.' : 'Template created.'); reset(); await refresh();
  };

  if (isPopup) {
    return (
      <div className="templates-popup-content">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Brand system</p>
            <h2>{editingId ? 'Edit template' : 'Create template'}</h2>
          </div>
          {editingId && <button type="button" className="secondary-action" onClick={reset}>Cancel</button>}
        </div>
        <form className="template-form" onSubmit={submit}>
          <label>Name<input value={form.name} onChange={(event) => change('name', event.target.value)} required /></label>
          <label>Document type<select value={form.documentType} onChange={(event) => change('documentType', event.target.value)}><option value="quotation">Quotation</option><option value="bill">Bill</option><option value="both">Both</option></select></label>
          <label>Primary color<input type="color" value={form.primaryColor} onChange={(event) => change('primaryColor', event.target.value)} /></label>
          <label>Secondary color<input type="color" value={form.secondaryColor} onChange={(event) => change('secondaryColor', event.target.value)} /></label>
          <label>Accent color<input type="color" value={form.accentColor} onChange={(event) => change('accentColor', event.target.value)} /></label>
          <label className="full-width">Terms<textarea rows="2" value={form.terms} onChange={(event) => change('terms', event.target.value)} /></label>
          <label className="full-width">Footer<textarea rows="2" value={form.footer} onChange={(event) => change('footer', event.target.value)} /></label>
          <label className="template-check"><input type="checkbox" checked={form.isDefault} onChange={(event) => change('isDefault', event.target.checked)} /> Use as default</label>
          <button type="submit" className="primary-action">{editingId ? 'Save template' : 'Create template'}</button>
        </form>
        <div className="section-heading" style={{ marginTop: '2rem' }}>
          <div>
            <p className="eyebrow">Your templates</p>
            <h2>Saved templates</h2>
          </div>
        </div>
        <div className="admin-user-list">
          {templates.map((template) => (
            <article className="admin-user-row template-row" key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <span>{template.documentType === 'both' ? 'Quotations & Bills' : template.documentType === 'bill' ? 'Bills only' : 'Quotations only'}</span>
                {template.isDefault && <small>Default</small>}
              </div>
              <div className="saved-actions">
                <button type="button" className="secondary-action" onClick={() => { setEditingId(template.id); setForm({ name: template.name, documentType: template.documentType, primaryColor: template.primaryColor, secondaryColor: template.secondaryColor, accentColor: template.accentColor, terms: template.terms, footer: template.footer, logoUrl: template.logoUrl, isDefault: template.isDefault }); }}>
                  <ActionIcon type="edit" /> Edit
                </button>
                <button type="button" className="secondary-action" onClick={async () => { if (window.confirm('Delete this template?')) { const result = await deleteTemplate(template.id); if (result.response.ok) { alert('Template deleted.'); await refresh(); } else { alert(result.data?.error || 'Unable to delete template.'); } } }}>
                  <ActionIcon type="delete" /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    );
  }

  return (
    <main className="admin-page templates-page">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Document studio</p>
          <h1>Templates</h1>
          <p>Give quotations and bills a consistent, recognizable finish.</p>
        </div>
        <button type="button" className="icon-button" onClick={() => navigate('/')} aria-label="Back to overview">
          <ActionIcon type="back" />
        </button>
      </header>
      <section className="admin-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Brand system</p>
            <h2>{editingId ? 'Edit template' : 'Create template'}</h2>
          </div>
          {editingId && <button type="button" className="secondary-action" onClick={reset}>Cancel</button>}
        </div>
        <form className="template-form" onSubmit={submit}>
          <label>Name<input value={form.name} onChange={(event) => change('name', event.target.value)} required /></label>
          <label>Document type<select value={form.documentType} onChange={(event) => change('documentType', event.target.value)}><option value="quotation">Quotation</option><option value="bill">Bill</option><option value="both">Both</option></select></label>
          <label>Primary color<input type="color" value={form.primaryColor} onChange={(event) => change('primaryColor', event.target.value)} /></label>
          <label>Secondary color<input type="color" value={form.secondaryColor} onChange={(event) => change('secondaryColor', event.target.value)} /></label>
          <label>Accent color<input type="color" value={form.accentColor} onChange={(event) => change('accentColor', event.target.value)} /></label>
          <label className="full-width">Terms<textarea rows="2" value={form.terms} onChange={(event) => change('terms', event.target.value)} /></label>
          <label className="full-width">Footer<textarea rows="2" value={form.footer} onChange={(event) => change('footer', event.target.value)} /></label>
          <label className="template-check"><input type="checkbox" checked={form.isDefault} onChange={(event) => change('isDefault', event.target.checked)} /> Use as default</label>
          <button type="submit" className="primary-action">{editingId ? 'Save template' : 'Create template'}</button>
        </form>
      </section>
      <section className="admin-card">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Your templates</p>
            <h2>Saved templates</h2>
          </div>
        </div>
        <div className="admin-user-list">
          {templates.map((template) => (
            <article className="admin-user-row template-row" key={template.id}>
              <div>
                <strong>{template.name}</strong>
                <span>{template.documentType === 'both' ? 'Quotations & Bills' : template.documentType === 'bill' ? 'Bills only' : 'Quotations only'}</span>
                {template.isDefault && <small>Default</small>}
              </div>
              <div className="saved-actions">
                <button type="button" className="secondary-action" onClick={() => { setEditingId(template.id); setForm({ name: template.name, documentType: template.documentType, primaryColor: template.primaryColor, secondaryColor: template.secondaryColor, accentColor: template.accentColor, terms: template.terms, footer: template.footer, logoUrl: template.logoUrl, isDefault: template.isDefault }); }}>
                  <ActionIcon type="edit" /> Edit
                </button>
                <button type="button" className="secondary-action" onClick={async () => { if (window.confirm('Delete this template?')) { const result = await deleteTemplate(template.id); if (result.response.ok) { alert('Template deleted.'); await refresh(); } else { alert(result.data?.error || 'Unable to delete template.'); } } }}>
                  <ActionIcon type="delete" /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default Templates;