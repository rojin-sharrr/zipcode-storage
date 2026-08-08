import { useState } from 'react';

export default function LoginScreen({ onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong. Please try again.');
      } else {
        onSuccess(data.name || null);
      }
    } catch {
      setError('Could not reach the server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <span className="eyebrow">StoreFinder</span>
        <h1 className="login-title">Sign in</h1>
        <p className="login-subtitle">This is a private tool. Enter your credentials to continue.</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <input
            className="login-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="username"
            disabled={loading}
            autoFocus
          />
          <input
            className="login-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoComplete="current-password"
            disabled={loading}
          />

          {error && (
            <div className="error-banner login-error">
              <span>⚠</span> {error}
            </div>
          )}

          <button type="submit" className="login-btn" disabled={!email || !password || loading}>
            {loading ? <span className="btn-spinner login-spinner" /> : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
