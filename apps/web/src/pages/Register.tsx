import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { ApiError } from '../lib/api';
import { Button } from '../components/Button';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await register({ name, email, password });
      navigate('/account', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm py-16">
      <h1 className="mb-6 font-display text-2xl text-content">Create account</h1>
      {error && <p className="mb-3 font-body text-sm text-danger">{error}</p>}
      <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" aria-label="Full name"
        className="mb-3 w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content" />
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email"
        className="mb-3 w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content" />
      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password"
        className="mb-4 w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content" />
      <Button type="submit" disabled={busy} className="w-full">{busy ? 'Creating account…' : 'Create account'}</Button>
      <p className="mt-4 font-body text-sm text-muted">Already have an account? <Link to="/login" className="text-accent">Sign in</Link></p>
    </form>
  );
}
