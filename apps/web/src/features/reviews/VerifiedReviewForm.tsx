import { useState } from 'react';
import { submitVerifiedReview, ApiError } from '../../lib/api';

/**
 * Review form for a customer with no account.
 *
 * Guest checkout is the norm here, so gating reviews behind sign-in meant almost
 * nobody could leave one. Proof of purchase is the order number + the phone it was
 * placed with — the same pair used by order tracking — so every review published
 * this way is a confirmed buyer.
 */
export function VerifiedReviewForm({ slug, onDone }: { slug: string; onDone: () => void }) {
  const [orderNumber, setOrderNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="card-lux space-y-4 rounded-xl p-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setBusy(true);
        try {
          await submitVerifiedReview(slug, {
            orderNumber: orderNumber.trim(),
            phone: phone.trim(),
            rating,
            title: title.trim() || undefined,
            body: body.trim(),
          });
          onDone();
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            setError('We could not match that order number and phone number.');
          } else if (err instanceof ApiError && err.status === 403) {
            setError('That order does not include this perfume.');
          } else if (err instanceof ApiError && err.status === 409) {
            setError('A review has already been left for this order.');
          } else if (err instanceof ApiError && err.status === 400) {
            setError('Please check the form and try again.');
          } else {
            setError('Something went wrong. Please try again.');
          }
        } finally {
          setBusy(false);
        }
      }}
    >
      <div>
        <h3 className="font-display text-lg text-content">Write a review</h3>
        <p className="mt-1 font-body text-xs text-muted">
          For customers who bought this. Your order details confirm the purchase and are never shown.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="vr-order" className="mb-1 block font-body text-sm text-muted">Order number</label>
          <input
            id="vr-order"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="HRC-XXXXXXXX-XXXX"
            className="field-lux w-full"
            required
          />
        </div>
        <div>
          <label htmlFor="vr-phone" className="mb-1 block font-body text-sm text-muted">Phone used to order</label>
          <input
            id="vr-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01012345678"
            inputMode="tel"
            className="field-lux w-full"
            required
          />
        </div>
      </div>

      <fieldset>
        <legend className="mb-1 font-body text-sm text-muted">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              aria-pressed={rating === n}
              className={`text-2xl leading-none transition-colors ${n <= rating ? 'text-accent' : 'text-muted/40'}`}
            >
              ★
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="vr-title" className="mb-1 block font-body text-sm text-muted">Title (optional)</label>
        <input id="vr-title" value={title} onChange={(e) => setTitle(e.target.value)} className="field-lux w-full" />
      </div>

      <div>
        <label htmlFor="vr-body" className="mb-1 block font-body text-sm text-muted">Your review</label>
        <textarea
          id="vr-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="field-lux w-full"
          required
        />
      </div>

      {error && <p className="font-body text-sm text-warning">{error}</p>}

      <button
        type="submit"
        disabled={busy || !orderNumber.trim() || !phone.trim() || !body.trim()}
        className="btn-lux w-full disabled:opacity-50"
      >
        {busy ? 'Sending…' : 'Submit review'}
      </button>
    </form>
  );
}
