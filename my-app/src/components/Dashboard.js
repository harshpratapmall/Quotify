import { useState } from 'react';
import ActionIcon from './ActionIcon';
import quotifyLogo from '../assets/quotify-logo.svg';
import { APP_ROUTES } from '../config/routes';
import { DOCUMENT_TYPES, documentCopy } from '../config/documents';

function Dashboard({ profile, user, pathname, navigate, logout, startNewDocument, savedDocuments }) {
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const launchDocument = (type, source) => {
    setCreateMenuOpen(false);
    startNewDocument(type, source);
  };

  return (
    <div className="app-shell workspace-shell">
      <header className="topbar">
        <div className="topbar-user">{user?.displayName || user?.username}</div>
        <div className="topbar-brand"><img src={profile?.logoUrl || quotifyLogo} alt={profile?.logoUrl ? `${profile.businessName || 'Business'} logo` : 'Quotify'} /></div>
        <div className="topbar-actions">
          <button type="button" className="topbar-icon-action" aria-label="Business profile" title="Business profile" onClick={() => navigate(APP_ROUTES.businessProfile)}><ActionIcon type="profile" /></button>
          {user?.role?.toLowerCase() === 'admin' && <button type="button" className="secondary-action topbar-admin-action" onClick={() => navigate(APP_ROUTES.adminUsers)}>Manage users</button>}
          <div className="topbar-create-menu">
            <button type="button" className="topbar-icon-action topbar-create-action" aria-label="Create document" title="Create document" aria-expanded={createMenuOpen} onClick={() => setCreateMenuOpen((open) => !open)}><ActionIcon type="plus" /></button>
            {createMenuOpen && <div className="create-document-menu" role="menu"><button type="button" role="menuitem" onClick={() => launchDocument(DOCUMENT_TYPES.quotation, 'create-menu')}><ActionIcon type="quotation" /> New quotation</button><button type="button" role="menuitem" onClick={() => launchDocument(DOCUMENT_TYPES.bill, 'create-menu')}><ActionIcon type="bill" /> New bill</button></div>}
          </div>
          <button type="button" className="topbar-icon-action topbar-logout-action" aria-label="Log out" title="Log out" onClick={logout}><ActionIcon type="logout" /></button>
        </div>
      </header>

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar" aria-label="Workspace navigation">
          <p className="sidebar-label">Workspace</p>
          <button type="button" className={`sidebar-link ${pathname === APP_ROUTES.home ? 'active' : ''}`} onClick={() => navigate(APP_ROUTES.home)}>Overview</button>
          <button type="button" className={`sidebar-link ${pathname === APP_ROUTES.quotations ? 'active' : ''}`} onClick={() => navigate(APP_ROUTES.quotations)}><ActionIcon type="quotation" /> Quotations</button>
          <button type="button" className={`sidebar-link ${pathname === APP_ROUTES.bills ? 'active bill-active' : ''}`} onClick={() => navigate(APP_ROUTES.bills)}><ActionIcon type="bill" /> Bills</button>
          <div className="sidebar-divider" />
          <p className="sidebar-label">Create</p>
          <button type="button" className="sidebar-create quotation-create" onClick={() => launchDocument(DOCUMENT_TYPES.quotation, 'sidebar')}><ActionIcon type="plus" /> New quotation</button>
          <button type="button" className="sidebar-create bill-create" onClick={() => launchDocument(DOCUMENT_TYPES.bill, 'sidebar')}><ActionIcon type="plus" /> New bill</button>
        </aside>

        <main className="dashboard-main">
          <section className="document-hero-card">
            <p className="eyebrow">Document studio</p>
            <h2>From first estimate to final payment.</h2>
            <p>Build polished quotations and professional bills from one calm, organized workspace.</p>
            <div className="document-hero-actions"><button type="button" className="primary-action" onClick={() => launchDocument(DOCUMENT_TYPES.quotation, 'hero')}><ActionIcon type="quotation" /> Create quotation</button><button type="button" className="bill-primary-action" onClick={() => launchDocument(DOCUMENT_TYPES.bill, 'hero')}><ActionIcon type="bill" /> Create bill</button></div>
          </section>

          <section className="document-library-summary">
            {[DOCUMENT_TYPES.quotation, DOCUMENT_TYPES.bill].map((type) => {
              const copy = documentCopy(type);
              const documents = savedDocuments[type] || [];
              return <article className={`document-summary-card ${type}`} key={type}><ActionIcon type={type} /><p>{copy.plural}</p><strong>{documents.length}</strong><span>saved {copy.plural.toLowerCase()}</span><button type="button" onClick={() => navigate(type === DOCUMENT_TYPES.bill ? APP_ROUTES.bills : APP_ROUTES.quotations)}>Open library <ActionIcon type="library" /></button></article>;
            })}
          </section>
        </main>
      </div>
    </div>
  );
}

export default Dashboard;
