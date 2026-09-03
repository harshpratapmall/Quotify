import { useState } from 'react';
import companyLogo from '../assets/d2d-experts-logo.webp';

function LoginScreen({ onLogin, isLoggingIn, error }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const submitLogin = (event) => {
    event.preventDefault();
    onLogin({ username, password });
  };

  return (
    <main className="login-page">
      <section className="login-showcase">
        <div className="login-brand">
          <img className="company-logo login-logo" src={companyLogo} alt="Door2Door Experts" />
        </div>
        <div className="login-copy">
          <p className="eyebrow">Welcome back</p>
          <h2>Every beautiful space starts with a confident proposal.</h2>
          <p>Sign in to build tailored estimates, review project pricing, and create client-ready quotations.</p>
        </div>
        <div className="login-swatches" aria-hidden="true"><span /><span /><span /></div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submitLogin}>
          <p className="eyebrow">Secure access</p>
          <h2>Sign in to your workspace</h2>
          <p className="login-help">Use the account shared with you by Door2Door Interiors.</p>
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
        </form>
      </section>
    </main>
  );
}

export default LoginScreen;
