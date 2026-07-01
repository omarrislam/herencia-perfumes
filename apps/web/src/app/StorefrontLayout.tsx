import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTheme } from './ThemeProvider';
import { useAuth } from '../features/auth/AuthContext';
import { useCart } from '../features/cart/CartContext';
import { CartDrawer } from '../features/cart/CartDrawer';
import { Button } from '../components/Button';

export function StorefrontLayout() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();
  const { count, setOpen } = useCart();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line">
        <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <Link to="/" className="font-display text-xl text-content">HERENCIA</Link>
          <div className="flex items-center gap-4 font-body text-sm">
            <NavLink to="/products" className="text-content hover:text-accent">Perfumes</NavLink>
            <NavLink to="/bundles" className="text-content hover:text-accent">Bundles</NavLink>
            <NavLink to="/find-your-scent" className="text-content hover:text-accent">Find Your Scent</NavLink>
            {user ? (
              <>
                <NavLink to="/account" className="text-content hover:text-accent">Account</NavLink>
                <button onClick={() => void logout()} className="text-muted hover:text-accent">Sign out</button>
              </>
            ) : (
              <NavLink to="/login" className="text-content hover:text-accent">Sign in</NavLink>
            )}
            <button
              type="button"
              aria-label={`Cart${count > 0 ? `, ${count} item${count === 1 ? '' : 's'}` : ''}`}
              onClick={() => setOpen(true)}
              className="relative font-body text-content hover:text-accent"
            >
              Cart
              {count > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-maroon px-1 text-xs text-cream">
                  {count}
                </span>
              )}
            </button>
            <Button variant="ghost" onClick={toggle} aria-label="Toggle theme">{theme === 'light' ? '🌙' : '☀️'}</Button>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">
        <Outlet />
      </main>
      <footer className="border-t border-line p-6 text-center font-body text-sm text-muted">
        © {new Date().getFullYear()} HERENCIA — Luxury in every drop.
      </footer>
      <CartDrawer />
    </div>
  );
}
