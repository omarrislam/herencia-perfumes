import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchSettings } from '../lib/api';

// Small floating WhatsApp + Instagram buttons, bottom-left. Smart hide: they
// slip away while the user scrolls down (reading), and return on scroll-up,
// on idle, or near the top. Suppressed on checkout/confirmation/admin so the
// purchase flow stays clean. Transforms/opacity only; reduced-motion users
// get them permanently visible (no movement).
const HIDDEN_ON = ['/checkout', '/order-confirmation'];

export function FloatingSocials() {
  const { pathname } = useLocation();
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const idleTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return; // always visible, never moves
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastY.current;
      lastY.current = y;
      if (y < 120) setHidden(false);
      else if (delta > 6) setHidden(true);
      else if (delta < -6) setHidden(false);
      clearTimeout(idleTimer.current);
      idleTimer.current = setTimeout(() => setHidden(false), 1000);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearTimeout(idleTimer.current);
    };
  }, []);

  if (HIDDEN_ON.some((p) => pathname.startsWith(p)) || pathname.startsWith('/admin')) return null;

  const whatsapp = settings.data?.whatsappNumber?.replace(/\D/g, '');
  const instagram = settings.data?.socialLinks?.instagram;
  if (!whatsapp && !instagram) return null;

  const links = [
    whatsapp && {
      label: 'Chat on WhatsApp',
      href: `https://wa.me/${whatsapp}?text=${encodeURIComponent('Hi HERENCIA! I have a question.')}`,
      d: 'M12 2a10 10 0 0 0-8.6 15.06L2 22l5.06-1.33A10 10 0 1 0 12 2Zm5.1 14.13c-.22.62-1.28 1.18-1.77 1.22-.47.05-.9.24-3.03-.63-2.56-1.04-4.18-3.7-4.3-3.87-.13-.17-1.03-1.37-1.03-2.6 0-1.24.65-1.85.88-2.1.23-.25.5-.31.67-.31l.48.01c.15 0 .36-.06.56.43.22.53.73 1.83.8 1.96.06.13.1.28.02.45-.08.17-.13.28-.25.43l-.37.43c-.12.12-.25.25-.11.5.14.24.63 1.04 1.35 1.68.93.83 1.71 1.09 1.95 1.21.24.13.38.11.52-.06.14-.17.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.6-.16 1.22Z',
    },
    instagram && {
      label: 'Follow on Instagram',
      href: instagram,
      d: 'M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2Zm0 4.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8Zm0 8.08a3.18 3.18 0 1 1 0-6.36 3.18 3.18 0 0 1 0 6.36Zm6.24-8.28a1.14 1.14 0 1 1-2.29 0 1.14 1.14 0 0 1 2.29 0Z',
    },
  ].filter(Boolean) as { label: string; href: string; d: string }[];

  return (
    <div
      className={`fixed bottom-5 left-4 z-30 flex flex-col gap-2 transition-all duration-300 ease-out motion-reduce:transition-none ${
        hidden ? 'pointer-events-none -translate-x-3 opacity-0 motion-reduce:translate-x-0 motion-reduce:opacity-100 motion-reduce:pointer-events-auto' : 'translate-x-0 opacity-100'
      }`}
    >
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={l.label}
          title={l.label}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gold-hi/40 bg-espresso/90 text-cream shadow-lux backdrop-blur-sm transition-colors hover:border-gold-hi hover:text-gold-hi"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: 18, height: 18 }}>
            <path d={l.d} />
          </svg>
        </a>
      ))}
    </div>
  );
}
