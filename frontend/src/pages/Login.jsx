import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Button, Field } from '../components/ui';

export default function Login() {
  const { login, verifyTwoFactor } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@coop.test');
  const [password, setPassword] = useState('password123');
  const [code, setCode] = useState('');
  const [pendingToken, setPendingToken] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCredentials(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.requires2FA) {
        setPendingToken(result.pendingToken);
      } else {
        navigate(result.user.role === 'MEMBER' ? '/' : '/admin');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleTwoFactor(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await verifyTwoFactor(pendingToken, code);
      navigate(user.role === 'MEMBER' ? '/' : '/admin');
    } catch (err) {
      setError(err.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-5" style={{ background: 'var(--bg)' }}>
      <div className="card p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold">Coop<span className="text-accent">Ledger</span></div>
          <div className="text-dim text-sm mt-1">Member & Loan Management</div>
        </div>

        {!pendingToken ? (
          <form onSubmit={handleCredentials}>
            <Field label="Email or member ID">
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
            </Field>
            <Field label="Password">
              <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
            </Field>
            {error && <div className="text-danger text-sm mb-3">{error}</div>}
            <Button type="submit" className="w-full mt-2" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleTwoFactor}>
            <div className="text-sm text-dim mb-4">Enter the 6-digit code from your authenticator app.</div>
            <Field label="Authentication code">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                autoFocus
                required
              />
            </Field>
            {error && <div className="text-danger text-sm mb-3">{error}</div>}
            <Button type="submit" className="w-full mt-2" disabled={loading || code.length !== 6}>
              {loading ? 'Verifying…' : 'Verify'}
            </Button>
            <button
              type="button"
              className="text-dim text-xs mt-3 w-full text-center"
              onClick={() => { setPendingToken(null); setCode(''); setError(''); }}
            >
              ← Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
