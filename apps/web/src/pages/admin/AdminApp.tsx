// apps/web/src/pages/admin/AdminApp.tsx
import { Routes, Route, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RequireAdmin } from '../../features/auth/RequireAdmin';
import { useAuth } from '../../features/auth/AuthContext';
import { adminFetchOrders } from '../../features/admin/adminClient';
import AdminDashboard from './AdminDashboard';
import AdminHome from './AdminHome';
import AdminProducts from './AdminProducts';
import AdminInventory from './AdminInventory';
import AdminScentFamilies from './AdminScentFamilies';
import AdminOrders from './AdminOrders';
import AdminReviews from './AdminReviews';
import AdminQuiz from './AdminQuiz';
import AdminBlog from './AdminBlog';

const NAV = [
  { to: '/admin/dashboard', label: 'Dashboard' },
  { to: '/admin/home', label: 'Home' },
  { to: '/admin/products', label: 'Products' },
  { to: '/admin/inventory', label: 'Inventory' },
  { to: '/admin/scent-families', label: 'Scent families' },
  { to: '/admin/orders', label: 'Orders', badgeKey: 'orders' as const },
  { to: '/admin/reviews', label: 'Reviews' },
  { to: '/admin/quiz', label: 'Quiz' },
  { to: '/admin/blog', label: 'Blog' },
];

export default function AdminApp() {
  const { logout } = useAuth();
  const pending = useQuery({
    queryKey: ['admin-orders', 'pending'],
    queryFn: () => adminFetchOrders('pending'),
    refetchInterval: 60_000,
  });
  const pendingCount = pending.data?.total ?? 0;

  const itemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center justify-between rounded-lg px-3 py-2 font-body text-sm transition-colors ${
      isActive ? 'bg-accent/12 text-accent' : 'text-content hover:bg-accent/5 hover:text-accent'
    }`;

  const badge = (label: string) =>
    label === 'Orders' && pendingCount > 0 ? (
      <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-medium text-white">
        {pendingCount}
      </span>
    ) : null;

  return (
    <RequireAdmin>
      <div className="flex min-h-[100dvh] bg-bg">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-60 flex-col border-r border-hairline bg-surface md:flex">
          <div className="flex items-center gap-2.5 border-b border-hairline p-5">
            <img src="/logo.png" alt="" className="h-9 w-9 object-contain" />
            <div>
              <p className="font-display text-lg leading-none tracking-[0.15em] text-content">HERENCIA</p>
              <p className="mt-1 font-body text-[10px] uppercase tracking-[0.2em] text-muted">Admin</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-3">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} className={itemClass}>
                <span>{n.label}</span>
                {badge(n.label)}
              </NavLink>
            ))}
          </nav>
          <div className="space-y-1 border-t border-hairline p-3">
            <NavLink to="/" className="block rounded-lg px-3 py-2 font-body text-sm text-muted hover:text-accent">View store ↗</NavLink>
            <button onClick={() => void logout()} className="block w-full rounded-lg px-3 py-2 text-left font-body text-sm text-muted hover:text-accent">Sign out</button>
          </div>
        </aside>

        {/* Mobile top bar */}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-b border-hairline bg-surface md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="font-display text-lg tracking-[0.15em] text-content">HERENCIA Admin</span>
              <button onClick={() => void logout()} className="font-body text-sm text-muted hover:text-accent">Sign out</button>
            </div>
            <nav className="flex gap-1 overflow-x-auto px-3 pb-3">
              {NAV.map((n) => (
                <NavLink key={n.to} to={n.to} className={({ isActive }) => `flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 font-body text-sm ${isActive ? 'bg-accent/12 text-accent' : 'text-content hover:text-accent'}`}>
                  {n.label}
                  {badge(n.label)}
                </NavLink>
              ))}
            </nav>
          </header>

          <main className="mx-auto w-full max-w-5xl flex-1 p-5 md:p-8">
            <Routes>
              <Route path="/" element={<AdminDashboard />} />
              <Route path="/dashboard" element={<AdminDashboard />} />
              <Route path="/home" element={<AdminHome />} />
              <Route path="/products" element={<AdminProducts />} />
              <Route path="/inventory" element={<AdminInventory />} />
              <Route path="/scent-families" element={<AdminScentFamilies />} />
              <Route path="/orders" element={<AdminOrders />} />
              <Route path="/reviews" element={<AdminReviews />} />
              <Route path="/quiz" element={<AdminQuiz />} />
              <Route path="/blog" element={<AdminBlog />} />
            </Routes>
          </main>
        </div>
      </div>
    </RequireAdmin>
  );
}
