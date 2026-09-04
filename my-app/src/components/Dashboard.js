import ActionIcon from './ActionIcon';

function Dashboard({
  companyLogo,
  user,
  navigate,
  logout,
  startNewQuotation,
  openSavedQuotation,
  deleteSavedQuotation,
  savedQuotations,
  saveStatus,
}) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <img className="company-logo header-logo" src={companyLogo} alt="Door2Door Experts" />
        <span>{user?.displayName || user?.username}</span>
        {user?.role?.toLowerCase() === 'admin' && <button type="button" className="secondary-action" onClick={() => navigate('/admin/users')}>Manage users</button>}
        <button
          type="button"
          className="primary-action desktop-only"
          onClick={() => startNewQuotation('header')}
        >
          <ActionIcon type="plus" /> Create New Quotation
        </button>
        <button type="button" className="logout-action" onClick={logout}><ActionIcon type="logout" /> Log out</button>
      </header>

      <main className="page-content">
        <section className="hero-card">
          <div className="hero-copy">
            <p className="eyebrow">Elegant proposals for inspired spaces</p>
            <h2>Design quotations that feel as premium as your interiors.</h2>
            <p className="hero-text">
              Build client-ready estimates for modular kitchens, wardrobes,
              living spaces, and complete home transformations from one clean
              screen.
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="primary-action"
                onClick={() => startNewQuotation('hero')}
              >
                <ActionIcon type="plus" /> Create New Quotation
              </button>
            </div>
          </div>

          <div className="hero-panel">
            <div className="proposal-panel">
              <p className="eyebrow">Proposal workflow</p>
              <h3>From room brief to a client-ready estimate.</h3>
              <div className="proposal-steps">
                <div><span>01</span><p>Capture the project brief and site details.</p></div>
                <div><span>02</span><p>Build a clear, itemized interior estimate.</p></div>
                <div><span>03</span><p>Share a polished quotation with confidence.</p></div>
              </div>
            </div>
          </div>
        </section>

        <section className="saved-panel">
          <div className="section-heading">
            <div><p className="eyebrow">Saved Quotations</p><h3>Quotation library</h3></div>
            <button type="button" className="primary-action new-quotation-action" onClick={() => startNewQuotation('library')}><ActionIcon type="plus" /> New quotation</button>
          </div>
          {savedQuotations.length === 0 ? <p className="section-text">No saved quotations yet. Create one and save it for later.</p> : (
            <div className="saved-quotation-list">
              {savedQuotations.map((entry) => (
                <article className="saved-quotation-card" key={entry.id}>
                  <div>
                    <strong>{entry.clientName || 'Untitled client'}</strong>
                    <span>{entry.projectName || 'Untitled project'} · {entry.quoteDate || 'No date'}</span>
                    <small>₹ {Number(entry.total || 0).toLocaleString('en-IN')}</small>
                  </div>
                  <div className="saved-actions">
                    <button type="button" className="icon-action" aria-label="Open quotation" title="Open quotation" onClick={() => openSavedQuotation(entry.id, true)}><ActionIcon type="open" /></button>
                    <button type="button" className="icon-action" aria-label="Edit quotation" title="Edit quotation" onClick={() => openSavedQuotation(entry.id)}><ActionIcon type="edit" /></button>
                    <button type="button" className="icon-action delete-action" aria-label="Delete quotation" title="Delete quotation" onClick={() => deleteSavedQuotation(entry.id)}><ActionIcon type="delete" /></button>
                  </div>
                </article>
              ))}
            </div>
          )}
          {saveStatus && <p className="save-status" role="status">{saveStatus}</p>}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
