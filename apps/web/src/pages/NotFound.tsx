import { Link } from 'react-router-dom';
import { useSeo } from '../lib/useSeo';

export default function NotFound() {
  useSeo({ title: 'Not found — HERENCIA' });
  return (
    <section className="grid place-items-center gap-4 py-24 text-center">
      <h1 className="font-display text-4xl text-content">404</h1>
      <p className="font-body text-muted">This page drifted away like a top note.</p>
      <Link to="/" className="font-body text-accent underline">Return home</Link>
    </section>
  );
}
