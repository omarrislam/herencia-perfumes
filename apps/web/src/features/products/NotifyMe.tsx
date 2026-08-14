import { useState } from 'react';
import { notifyWhenBack } from '../../lib/api';
import { ApiError } from '../../lib/api';

/**
 * Captures demand on a sold-out size instead of losing the visitor.
 *
 * Deliberately asks for a phone rather than an email: this store reaches customers
 * over WhatsApp (decision #48), and most shoppers here check out as guests without
 * ever giving an email.
 */
export function NotifyMe({ slug, sizeLabel }: { slug: string; sizeLabel: string }) {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (done) {
    return (
      <p className="rounded-md border border-success/40 bg-success-soft px-4 py-3 font-body text-sm text-content">
        ✓ We&apos;ll message you on WhatsApp the moment {sizeLabel} is back.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-hairline py-3 font-body text-sm font-medium tracking-wide text-content transition-colors hover:border-accent hover:text-accent"
      >
        Notify me when it&apos;s back
      </button>
    );
  }

  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
          await notifyWhenBack(slug, { sizeLabel, phone });
          setDone(true);
        } catch (err) {
          setError(
            err instanceof ApiError && err.status === 400
              ? 'Enter a valid Egyptian mobile number, e.g. 01012345678'
              : 'Could not save that just now. Please try again.',
          );
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="notify-phone" className="block font-body text-sm text-muted">
        Your WhatsApp number
      </label>
      <div className="flex gap-2">
        <input
          id="notify-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="01012345678"
          inputMode="tel"
          autoComplete="tel"
          aria-invalid={!!error}
          aria-describedby={error ? 'notify-error' : undefined}
          className={`field-lux flex-1 ${error ? 'border-warning' : ''}`}
        />
        <button
          type="submit"
          disabled={busy || phone.trim().length === 0}
          className="rounded-md bg-cta px-4 font-body text-sm font-medium text-cream transition-colors hover:bg-cta-hover disabled:opacity-50"
        >
          {busy ? 'Saving…' : 'Notify me'}
        </button>
      </div>
      {error && (
        <p id="notify-error" className="font-body text-xs text-warning">
          {error}
        </p>
      )}
      <p className="font-body text-xs text-muted">Only used to tell you about this restock.</p>
    </form>
  );
}
