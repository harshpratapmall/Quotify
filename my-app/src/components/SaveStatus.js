// Single save/status message line used by every modal and admin page.
function SaveStatus({ message, className = '' }) {
  if (!message) return null;
  return <p className={['save-status', className].filter(Boolean).join(' ')} role="status">{message}</p>;
}

export default SaveStatus;