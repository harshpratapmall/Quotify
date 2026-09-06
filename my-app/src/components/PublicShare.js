import { useEffect, useState } from 'react';
import { fetchPublicShare } from '../services/shares';
import { currency } from '../utils/formatters';

function PublicShare({ token }) {
  const [share, setShare] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPublicShare(token).then(({ response, data }) => {
      if (!response.ok) {
        setError(data?.error || 'This shared document is unavailable.');
        return;
      }
      setShare(data);
    }).catch(() => setError('This shared document is unavailable.'));
  }, [token]);

  if (error) return <main className="public-share-page"><section className="public-share-card public-share-state"><p className="eyebrow">Shared document</p><h1>Link unavailable</h1><p>{error}</p></section></main>;
  if (!share) return <main className="public-share-page"><section className="public-share-card public-share-state"><p className="eyebrow">Shared document</p><h1>Loading document...</h1><p>Please wait while we prepare the document.</p></section></main>;

  let payload = share.payload;
  if (typeof payload === 'string') {
    try { payload = JSON.parse(payload); } catch { payload = {}; }
  }
  const items = payload?.items || [];
  
  // Generate document number similar to PDF
  const quotePrefix = share.business?.quotePrefix || 'QUOTE';
  const clientInitials = share.clientName?.slice(0, 3).toUpperCase() || 'XXX';
  const dateSuffix = share.date?.replaceAll('-', '') || new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const quoteNumber = `${share.documentType === 'bill' ? 'BILL' : quotePrefix}-${clientInitials}-${dateSuffix}-${share.id?.slice(-6).toUpperCase() || 'DRAFT'}`;

  return (
    <main className="public-share-page">
      <section className="public-share-card">
        <header className="public-share-header">
          <div>
            {share.business?.logoUrl && <img src={share.business.logoUrl} alt="" />}
            <div>
              <p className="eyebrow">{share.documentType?.toUpperCase()}</p>
              <h1>{share.business?.businessName || share.username || 'Quotation'}</h1>
              <p className="document-number">{quoteNumber}</p>
            </div>
          </div>
          <span>{share.date}</span>
        </header>
        <div className="public-share-client">
          <div><small>TO</small><strong>{share.clientName}</strong><span>{share.email || share.phone || 'Contact details to be added'}</span></div>
          <div><small>ADDRESS</small><strong>{share.siteLocation || 'Site location to be added'}</strong></div>
          <div><small>PROJECT</small><strong>{share.projectName || 'Interior Project'}</strong></div>
        </div>
        <div className="public-share-items">
          <div className="public-share-item public-share-item-heading">
            <span>Description</span>
            <span>Qty</span>
            <span>Rate</span>
            <span>Amount</span>
          </div>
          {items.filter((item) => item.description || item.rate).map((item, index) => (
            <div className="public-share-item" key={`${item.description}-${index}`}>
              <span>{item.description || 'Untitled item'}</span>
              <span>{item.quantity || 0}</span>
              <span>{currency(Number(item.rate) || 0)}</span>
              <strong>{currency((Number(item.quantity) || 0) * (Number(item.rate) || 0))}</strong>
            </div>
          ))}
        </div>
        <div className="public-share-total">
          <span>Subtotal <strong>{currency(share.subtotal)}</strong></span>
          {share.includeGst && <span>GST ({share.gstRate}%) <strong>{currency(share.tax)}</strong></span>}
          <span className="grand-total">Total <strong>{currency(share.total)}</strong></span>
        </div>
        {share.business?.terms && <p className="public-share-footer">{share.business.terms}</p>}
      </section>
    </main>
  );
}

export default PublicShare;