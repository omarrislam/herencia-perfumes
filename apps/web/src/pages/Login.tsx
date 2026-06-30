import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { ApiError } from '../lib/api';
import { Button } from '../components/Button';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login({ email, password });
      navigate(location.state?.from ?? (user.role === 'admin' ? '/admin' : '/account'), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm py-16">
      <h1 className="mb-6 font-display text-2xl text-content">Sign in</h1>
      {error && <p className="mb-3 font-body text-sm text-red-500">{error}</p>}
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email"
        className="mb-3 w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content" />
      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password"
        className="mb-4 w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content" />
      <Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
      <p className="mt-4 font-body text-sm text-muted">No account? <Link to="/register" className="text-accent">Create one</Link></p>
    </form>
  );
}
