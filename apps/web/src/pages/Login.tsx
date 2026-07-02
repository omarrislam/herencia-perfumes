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
    <div className="mx-auto max-w-md py-16">
      <div className="mb-8 text-center">
        <p className="eyebrow">Welcome back</p>
        <h1 className="display mt-2 text-3xl text-content">Sign in</h1>
      </div>
      <form onSubmit={onSubmit} className="card-lux space-y-4 rounded-2xl p-8">
        {error && <p className="rounded-md bg-danger-soft px-3 py-2 font-body text-sm text-danger">{error}</p>}
        <label className="block">
          <span className="mb-1.5 block font-body text-sm text-muted">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-body text-sm text-muted">Password</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field-lux" />
        </label>
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
        <p className="pt-1 text-center font-body text-sm text-muted">No account? <Link to="/register" className="link-underline text-accent">Create one</Link></p>
      </form>
    </div>
  );
}
