import { Suspense } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTheme } from './ThemeProvider';
import { useAuth } from '../features/auth/AuthContext';
import { useCart } from '../features/cart/CartContext';
import { CartDrawer } from '../features/cart/CartDrawer';
import { BannerStrip } from '../components/BannerStrip';

const navLink = ({ isActive }: { isActive: boolean }) =>
  `link-underline font-body text-sm tracking-wide transition-colors ${
    isActive ? 'text-accent' : 'text-content hover:text-accent'
  }`;

export function StorefrontLayout() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { count, setOpen, justAdded } = useCart();
  const location = useLocation();
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-40 border-b border-hairline bg-bg/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link
            to="/"
            className="logo-shimmer font-display text-2xl tracking-[0.2em] text-content"
          >
            HERENCIA
          </Link>
          <div className="flex items-center gap-6">
            <div className="hidden items-center gap-6 md:flex">
              <NavLink to="/products" className={navLink}>Perfumes</NavLink>
              <NavLink to="/bundles" className={navLink}>Bundles</NavLink>
              <NavLink to="/find-your-scent" className={navLink}>Find Your Scent</NavLink>
              <NavLink to="/blog" className={navLink}>Journal</NavLink>
              {user ? (
                <>
                  <NavLink to="/account" className={navLink}>Account</NavLink>
                  <button onClick={() => void logout()} className="link-underline font-body text-sm tracking-wide text-muted transition-colors hover:text-accent">
                    Sign out
                  </button>
                </>
              ) : (
                <NavLink to="/login" className={navLink}>Sign in</NavLink>
              )}
            </div>
            <button
              type="button"
              aria-label={`Cart${count > 0 ? `, ${count} item${count === 1 ? '' : 's'}` : ''}`}
              onClick={() => setOpen(true)}
              className={`relative inline-flex items-center gap-2 font-body text-sm tracking-wide text-content transition-colors hover:text-accent ${justAdded ? 'motion-safe:animate-[pulse_0.6s_ease-out]' : ''}`}
            >
              Cart
              {count > 0 && (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-ink px-1.5 text-xs font-medium text-surface">
                  {count}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={toggle}
              aria-label="Toggle theme"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-content transition-colors hover:border-accent hover:text-accent"
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </div>
        </nav>
      </header>
      <BannerStrip placement="global_top" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-5 py-8">
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Suspense fallback={null}>
            <Outlet />
          </Suspense>
        </motion.div>
      </main>
      <footer className="mt-24 border-t border-hairline bg-bg-deep">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
            <div>
              <p className="font-display text-xl tracking-[0.2em] text-content">HERENCIA</p>
              <div className="rule-gold-left my-4" />
              <p className="max-w-xs font-body text-sm leading-relaxed text-muted">
                Heritage perfumery for the modern connoisseur — composed in small batches,
                worn like an heirloom.
              </p>
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
                <li><Link to={user ? '/account' : '/login'} className="link-underline transition-colors hover:text-accent">{user ? 'Account' : 'Sign in'}</Link></li>
                <li><a href="mailto:hello@herencia.example" className="link-underline transition-colors hover:text-accent">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="rule-gold mt-12" />
          <p className="mt-6 font-body text-xs tracking-wide text-muted">
            © {new Date().getFullYear()} HERENCIA. Crafted in Egypt.
          </p>
        </div>
      </footer>
      <CartDrawer />
    </div>
  );
}
