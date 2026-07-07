import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { fetchSettings, subscribeNewsletter } from '../lib/api';

const SEEN_KEY = 'herencia.emailPopup'; // 'subscribed' | ISO date of dismissal
export const DISCOUNT_KEY = 'herencia.discountCode';
const SHOW_DELAY_MS = 5000;
const REDISMISS_DAYS = 7;

// Pages where a marketing banner would get in the way of buying.
const QUIET_PATHS = ['/checkout', '/order-confirmation', '/cart'];

function shouldShow(pathname: string): boolean {
  if (pathname.startsWith('/admin') || QUIET_PATHS.some((p) => pathname.startsWith(p))) return false;
  try {
    const seen = localStorage.getItem(SEEN_KEY);
    if (!seen) return true;
    if (seen === 'subscribed') return false;
    const dismissedAt = new Date(seen).getTime();
    return Number.isNaN(dismissedAt) || Date.now() - dismissedAt > REDISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// Non-blocking, cookie-banner-style floating card: no backdrop, no scroll lock —
// the page stays fully interactive while it's on screen.
export function EmailPopup() {
  const { pathname } = useLocation();
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const popup = settings.data?.emailPopup;
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gotCode, setGotCode] = useState<string | null>(null);

  useEffect(() => {
    if (!popup?.enabled || !shouldShow(pathname)) return;
    const t = setTimeout(() => setOpen(true), SHOW_DELAY_MS);
    return () => clearTimeout(t);
    // Only arm the timer once settings arrive; route changes don't re-trigger an open banner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popup?.enabled]);

  // Hide (without marking dismissed) while the visitor is on a quiet page.
  const suppressed = pathname.startsWith('/admin') || QUIET_PATHS.some((p) => pathname.startsWith(p));

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(SEEN_KEY, gotCode ? 'subscribed' : new Date().toISOString()); } catch { /* private mode */ }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await subscribeNewsletter(email.trim());
      try {
        localStorage.setItem(SEEN_KEY, 'subscribed');
        if (res.code) localStorage.setItem(DISCOUNT_KEY, res.code);
      } catch { /* private mode */ }
      setGotCode(res.code);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong — please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const percent = popup?.discountPercent;

  return (
    <AnimatePresence>
      {open && !suppressed && (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          role="dialog"
          aria-label={popup?.title ?? 'Get a discount'}
          className="fixed inset-x-3 bottom-3 z-[45] mx-auto max-w-md rounded-xl border border-hairline bg-surface p-4 shadow-lux-lg sm:inset-x-auto sm:right-5 sm:bottom-5 sm:mx-0 sm:p-5"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface2 hover:text-content"
          >
            ✕
          </button>

          {gotCode ? (
            <div className="pr-6">
              <p className="font-display text-base text-content">Your code is ready</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md border border-dashed border-accent bg-accent/10 px-3 py-1 font-body text-sm font-semibold tracking-widest text-accent">
                  {gotCode}
                </span>
                <span className="font-body text-xs text-muted">
                  {percent ? `${percent}% off` : 'Discount'} — applied automatically at checkout.
                </span>
              </div>
            </div>
          ) : (
            <div className="pr-6">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="" className="h-8 w-8 shrink-0 object-contain" />
                <p className="font-display text-base leading-snug text-content">
                  {popup?.title ?? (percent ? `Take ${percent}% off your first order` : 'Join the maison')}
                </p>
              </div>
              <p className="mt-1.5 font-body text-xs leading-relaxed text-muted">
                {popup?.text ?? 'Leave your email and receive a discount code — applied automatically at checkout.'}
              </p>
              <form onSubmit={(e) => void submit(e)} className="mt-3 flex flex-col gap-2 sm:flex-row">
                <label htmlFor="popup-email" className="sr-only">Email address</label>
                <input
                  id="popup-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="field-lux min-w-0 flex-1 !py-2.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="shrink-0 rounded-lg bg-cta px-4 py-2.5 font-body text-sm font-medium text-cream transition-colors hover:bg-cta-hover disabled:opacity-50"
                >
                  {submitting ? 'One moment…' : percent ? `Get ${percent}% off` : 'Get my discount'}
                </button>
              </form>
              {error && <p className="mt-2 font-body text-xs text-danger">{error}</p>}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
