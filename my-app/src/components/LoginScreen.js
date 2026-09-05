import { useState } from 'react';
import quotifyLogo from '../assets/quotify-logo.svg';

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
        <div className="login-brand">
          <img className="company-logo login-logo" src={quotifyLogo} alt="Quotify" />
        </div>
        <div className="login-copy">
          <p className="eyebrow">Welcome back</p>
          <h2>Professional quotations, made for your business.</h2>
          <p>Build, save, and share clear client-ready quotations from one secure workspace.</p>
        </div>
        <div className="login-swatches" aria-hidden="true"><span /><span /><span /></div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={submitLogin}>
          <p className="eyebrow">Secure access</p>
          <h2>Sign in to your workspace</h2>
          <p className="login-help">Use the Quotify account shared with you by your administrator.</p>
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
