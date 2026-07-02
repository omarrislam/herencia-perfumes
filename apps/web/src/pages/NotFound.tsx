import { Link } from 'react-router-dom';
import { useSeo } from '../lib/useSeo';

export default function NotFound() {
  useSeo({ title: 'Not found — HERENCIA' });
  return (
    <section className="grid min-h-[55vh] place-items-center py-24 text-center">
      <div className="space-y-5">
        <p className="eyebrow">Lost the trail</p>
        <h1 className="display text-7xl text-content">404</h1>
        <p className="mx-auto max-w-sm font-body text-muted">
          This page drifted away like a top note. Let&apos;s get you back to the collection.
        </p>
        <Link to="/" className="btn-outline mt-2 inline-flex">Return home</Link>
      </div>
    </section>
  );
}
