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
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-16">
      <div className="mb-8 text-center">
        <p className="eyebrow">Join the maison</p>
        <h1 className="display mt-2 text-3xl text-content">Create account</h1>
      </div>
      <form onSubmit={onSubmit} className="card-lux space-y-4 rounded-2xl p-8">
        {error && <p className="rounded-md bg-danger-soft px-3 py-2 font-body text-sm text-danger">{error}</p>}
        <label className="block">
          <span className="mb-1.5 block font-body text-sm text-muted">Full name</span>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-body text-sm text-muted">Email</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field-lux" />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-body text-sm text-muted">Password</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="field-lux" />
        </label>
        <Button type="submit" disabled={busy} className="w-full">{busy ? 'Creating account…' : 'Create account'}</Button>
        <p className="pt-1 text-center font-body text-sm text-muted">Already have an account? <Link to="/login" className="link-underline text-accent">Sign in</Link></p>
      </form>
    </div>
  );
}
