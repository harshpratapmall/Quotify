import { useState } from 'react';
import businessDeskLogo from '../assets/business-desk-logo.png';

function LoginScreen({ onLogin, onGoogleLogin, isLoggingIn, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const submitLogin = (event) => {
    event.preventDefault();
    onLogin({ username, password });
  };

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="login-brand business-desk-brand">
          <img className="company-logo login-logo business-desk-logo" src={businessDeskLogo} alt="Business Desk" />
        </div>
        <div className="login-copy">
          <p className="eyebrow">Business Desk</p>
          <h2>Everything your business needs between enquiry and handover.</h2>
          <p>Keep client details, employee records, estimates, invoices, and payment follow-up connected.</p>
        </div>
        <div className="login-swatches" aria-hidden="true"><span /><span /><span /></div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submitLogin}>
          <p className="eyebrow">Secure access</p>
          <h2>Sign in to your workspace</h2>
          <p className="login-help">Use the Business Desk account shared with you by your administrator.</p>
          <label>
            Username
            <input type="text" autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Enter your username" required />
          </label>
          <label>
            Password
            <input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" required />
          </label>
          {error && <p className="login-error" role="alert">{error}</p>}
          <button type="submit" className="primary-action login-action" disabled={isLoggingIn}>{isLoggingIn ? 'Signing in...' : 'Sign In'}</button>
          <div className="login-divider" aria-hidden="true"><span>or</span></div>
          <button type="button" className="google-login-action" onClick={onGoogleLogin} disabled={isLoggingIn}>Continue with Google</button>
        </form>
      </section>
    </main>
  );
}

export default LoginScreen;
