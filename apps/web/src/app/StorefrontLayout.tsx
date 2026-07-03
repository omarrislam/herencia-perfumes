import { Suspense, useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from './ThemeProvider';
import { useAuth } from '../features/auth/AuthContext';
import { useCart } from '../features/cart/CartContext';
import { CartDrawer } from '../features/cart/CartDrawer';
import { fetchSettings } from '../lib/api';

const NAV = [
  { to: '/products', label: 'Perfumes' },
  { to: '/bundles', label: 'Bundles' },
  { to: '/find-your-scent', label: 'Find Your Scent' },
  { to: '/blog', label: 'Journal' },
];

export function StorefrontLayout() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { count, setOpen, justAdded } = useCart();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => setMenuOpen(false), [location.pathname]);
  // Lock body scroll while the full-screen mobile menu is open.
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  const isHome = location.pathname === '/';
  const settingsData = useQuery({ queryKey: ['settings'], queryFn: fetchSettings }).data;
  const promo = settingsData?.promoBar;
  const social = settingsData?.socialLinks;
  const whatsapp = settingsData?.whatsappNumber;
  // Light (over-hero) nav only on home, at the top, with the menu closed.
  const light = isHome && !scrolled && !menuOpen;

  const linkColor = light ? 'text-cream/90 hover:text-cream' : 'text-content hover:text-accent';
  const navLink = ({ isActive }: { isActive: boolean }) =>
    `link-underline font-body text-sm tracking-wide transition-colors ${
      isActive ? (light ? 'text-cream' : 'text-accent') : linkColor
    }`;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header
        className={`${isHome ? 'fixed' : 'sticky'} inset-x-0 top-0 z-40 transition-colors duration-300 ${
          light ? 'bg-transparent' : 'border-b border-hairline bg-bg/90 backdrop-blur-md'
        }`}
      >
        {/* Promo / announcement bar — above the navbar (managed in Admin → Home) */}
        {promo?.enabled && promo.text && (
          <div className="bg-espresso px-4 py-2 text-center font-body text-xs tracking-wide text-cream sm:text-sm">
            <span>{promo.text}</span>
            {promo.ctaLink && promo.ctaText && (
              promo.ctaLink.startsWith('/') ? (
                <Link to={promo.ctaLink} className="ml-2 font-medium text-gold-hi hover:underline">{promo.ctaText}</Link>
              ) : (
                <a href={promo.ctaLink} className="ml-2 font-medium text-gold-hi hover:underline" target="_blank" rel="noopener noreferrer">{promo.ctaText}</a>
              )
            )}
          </div>
        )}
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-5 sm:py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="HERENCIA crest" className="h-10 w-10 object-contain" />
            <span className={`logo-shimmer font-display text-xl tracking-[0.2em] sm:text-2xl ${light ? 'text-cream' : 'text-content'}`}>
              HERENCIA
            </span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={navLink}>{n.label}</NavLink>
            ))}
            {user ? (
              <>
                <NavLink to="/account" className={navLink}>Account</NavLink>
                <button onClick={() => void logout()} className={`link-underline font-body text-sm tracking-wide transition-colors ${linkColor}`}>Sign out</button>
              </>
            ) : (
              <NavLink to="/login" className={navLink}>Sign in</NavLink>
            )}
          </div>

          <div className={`flex items-center gap-3 sm:gap-4 ${light ? 'text-cream' : 'text-content'}`}>
            <button
              type="button"
              aria-label={`Cart${count > 0 ? `, ${count} item${count === 1 ? '' : 's'}` : ''}`}
              onClick={() => setOpen(true)}
              className={`relative inline-flex items-center gap-2 font-body text-sm tracking-wide transition-colors hover:text-accent ${justAdded ? 'motion-safe:animate-[pulse_0.6s_ease-out]' : ''}`}
            >
              <span className="hidden sm:inline">Cart</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="h-5 w-5 sm:hidden">
                <path d="M6 8h12l-1 11.5a1.5 1.5 0 0 1-1.5 1.4H8.5A1.5 1.5 0 0 1 7 19.5L6 8Z" />
                <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
              </svg>
              {count > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-espresso px-1.5 text-xs font-medium text-cream ring-1 ring-cream/30">
                  {count}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle theme"
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:border-accent hover:text-accent ${light ? 'border-cream/40' : 'border-hairline'}`}
            >
              {theme === 'light' ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" /></svg>
              )}
            </button>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className={`flex h-9 w-9 items-center justify-center rounded-full border transition-colors hover:border-accent hover:text-accent md:hidden ${light ? 'border-cream/40' : 'border-hairline'}`}
            >
              {menuOpen ? '✕' : '☰'}
            </button>
          </div>
        </nav>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              key="mobile-menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="fixed left-0 top-0 z-[60] flex h-[100dvh] w-screen flex-col bg-espresso md:hidden"
            >
              <div className="flex items-center justify-between px-5 py-4">
                <span className="font-display text-xl tracking-[0.2em] text-cream">HERENCIA</span>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-cream/40 text-cream transition-colors hover:border-gold-hi hover:text-gold-hi"
                >
                  ✕
                </button>
              </div>

              <nav className="flex flex-1 flex-col justify-center px-7">
                {NAV.map((n, i) => (
                  <motion.div
                    key={n.to}
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.06 + i * 0.06, duration: 0.4, ease: 'easeOut' }}
                  >
                    <NavLink
                      to={n.to}
                      onClick={() => setMenuOpen(false)}
                      className="group flex items-center gap-4 border-b border-cream/10 py-5"
                    >
                      <span className="font-body text-xs tracking-[0.25em] text-[#d8b878]">0{i + 1}</span>
                      <span className="font-display text-3xl text-cream transition-colors group-hover:text-gold-hi">{n.label}</span>
                    </NavLink>
                  </motion.div>
                ))}
              </nav>

              <div className="px-7 pb-10 pt-4">
                <div className="rule-gold mb-5 w-16" />
                <div className="flex items-center gap-6">
                  {user ? (
                    <>
                      <NavLink to="/account" onClick={() => setMenuOpen(false)} className="font-body text-sm tracking-wide text-cream/80 hover:text-gold-hi">Account</NavLink>
                      <button onClick={() => { setMenuOpen(false); void logout(); }} className="font-body text-sm tracking-wide text-cream/60 hover:text-gold-hi">Sign out</button>
                    </>
                  ) : (
                    <NavLink to="/login" onClick={() => setMenuOpen(false)} className="font-body text-sm tracking-wide text-cream/80 hover:text-gold-hi">Sign in</NavLink>
                  )}
                </div>
                <p className="mt-4 font-body text-xs tracking-wide text-cream/40">Heritage perfumery · Crafted in Egypt</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className={isHome ? 'w-full flex-1' : 'mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-5'}>
        <motion.div key={location.pathname} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </motion.div>
      </main>

      <footer className="mt-24 border-t border-hairline bg-bg-deep">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-5">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
                <p className="font-display text-xl tracking-[0.2em] text-content">HERENCIA</p>
              </div>
              <div className="rule-gold-left my-4" />
              <p className="max-w-xs font-body text-sm leading-relaxed text-muted">
                Heritage perfumery for the modern connoisseur — composed in small batches,
                worn like an heirloom.
              </p>
              <div className="mt-5 flex items-center gap-3">
                {[
                  { label: 'Instagram', href: social?.instagram || 'https://instagram.com', d: 'M12 2.2c3.2 0 3.6 0 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s0 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58 0-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.21 15.58 2.2 15.2 2.2 12s0-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.21 8.8 2.2 12 2.2Zm0 4.9a4.9 4.9 0 1 0 0 9.8 4.9 4.9 0 0 0 0-9.8Zm0 8.08a3.18 3.18 0 1 1 0-6.36 3.18 3.18 0 0 1 0 6.36Zm6.24-8.28a1.14 1.14 0 1 1-2.29 0 1.14 1.14 0 0 1 2.29 0Z' },
                  { label: 'Facebook', href: social?.facebook || 'https://facebook.com', d: 'M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12Z' },
                  { label: 'TikTok', href: social?.tiktok || 'https://tiktok.com', d: 'M16.5 3c.3 2.03 1.5 3.6 3.5 3.9v2.5c-1.2.05-2.4-.28-3.5-.95v6.05a5.5 5.5 0 1 1-5.5-5.5c.28 0 .55.02.82.06v2.6a2.9 2.9 0 1 0 2.08 2.78V3h2.6Z' },
                  ...(whatsapp ? [{ label: 'WhatsApp', href: `https://wa.me/${whatsapp.replace(/[^0-9]/g, '')}`, d: 'M12 2a10 10 0 0 0-8.6 15.06L2 22l5.06-1.33A10 10 0 1 0 12 2Zm5.1 14.13c-.22.62-1.28 1.18-1.77 1.22-.47.05-.9.24-3.03-.63-2.56-1.04-4.18-3.7-4.3-3.87-.13-.17-1.03-1.37-1.03-2.6 0-1.24.65-1.85.88-2.1.23-.25.5-.31.67-.31l.48.01c.15 0 .36-.06.56.43.22.53.73 1.83.8 1.96.06.13.1.28.02.45-.08.17-.13.28-.25.43l-.37.43c-.12.12-.25.25-.11.5.14.24.63 1.04 1.35 1.68.93.83 1.71 1.09 1.95 1.21.24.13.38.11.52-.06.14-.17.6-.7.76-.94.16-.24.32-.2.54-.12.22.08 1.4.66 1.64.78.24.12.4.18.46.28.06.1.06.6-.16 1.22Z' }] : []),
                ].map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:border-accent hover:text-accent">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4"><path d={s.d} /></svg>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <p className="eyebrow mb-4">Shop</p>
              <ul className="space-y-2.5 font-body text-sm text-muted">
                <li><Link to="/products" className="link-underline transition-colors hover:text-accent">Perfumes</Link></li>
                <li><Link to="/bundles" className="link-underline transition-colors hover:text-accent">Bundles</Link></li>
                <li><Link to="/find-your-scent" className="link-underline transition-colors hover:text-accent">Find Your Scent</Link></li>
              </ul>
            </div>
            <div>
              <p className="eyebrow mb-4">Maison</p>
              <ul className="space-y-2.5 font-body text-sm text-muted">
                <li><Link to="/blog" className="link-underline transition-colors hover:text-accent">Journal</Link></li>
                <li><Link to="/returns" className="link-underline transition-colors hover:text-accent">Returns &amp; refunds</Link></li>
                <li><Link to={user ? '/account' : '/login'} className="link-underline transition-colors hover:text-accent">{user ? 'Account' : 'Sign in'}</Link></li>
                <li><a href="mailto:hello@herencia.example" className="link-underline transition-colors hover:text-accent">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="rule-gold mt-12" />
          <p className="mt-6 font-body text-xs tracking-wide text-muted">© {new Date().getFullYear()} HERENCIA. Crafted in Egypt.</p>
        </div>
      </footer>
      <CartDrawer />
    </div>
  );
}
