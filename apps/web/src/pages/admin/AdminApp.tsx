// apps/web/src/pages/admin/AdminApp.tsx
import { Routes, Route, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { RequireAdmin } from '../../features/auth/RequireAdmin';
import { useAuth } from '../../features/auth/AuthContext';
import { adminFetchOrders } from '../../features/admin/adminClient';
import AdminHome from './AdminHome';
import AdminProducts from './AdminProducts';
import AdminScentFamilies from './AdminScentFamilies';
import AdminOrders from './AdminOrders';
import AdminReviews from './AdminReviews';
import AdminQuiz from './AdminQuiz';
import AdminBanners from './AdminBanners';
import AdminBlog from './AdminBlog';

export default function AdminApp() {
  const { logout } = useAuth();
  // Poll pending (new) orders for the admin notification badge.
  const pending = useQuery({
    queryKey: ['admin-orders', 'pending'],
    queryFn: () => adminFetchOrders('pending'),
    refetchInterval: 60_000,
  });
  const pendingCount = pending.data?.total ?? 0;
  return (
    <RequireAdmin>
      <div className="min-h-screen">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 p-4 font-body text-sm">
            <Link to="/admin/products" className="font-display text-lg text-content">
              HERENCIA Admin
            </Link>
            <Link to="/admin/home" className="text-content hover:text-accent">
              Home
            </Link>
            <Link to="/admin/products" className="text-content hover:text-accent">
              Products
            </Link>
            <Link to="/admin/scent-families" className="text-content hover:text-accent">
              Scent families
            </Link>
            <Link to="/admin/orders" className="relative text-content hover:text-accent">
              Orders
              {pendingCount > 0 && (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1.5 text-xs font-medium text-white" title={`${pendingCount} new order${pendingCount === 1 ? '' : 's'}`}>
                  {pendingCount}
                </span>
              )}
            </Link>
            <Link to="/admin/reviews" className="text-content hover:text-accent">
              Reviews
            </Link>
            <Link to="/admin/quiz" className="text-content hover:text-accent">
              Quiz
            </Link>
            <Link to="/admin/banners" className="text-content hover:text-accent">
              Banners
            </Link>
            <Link to="/admin/blog" className="text-content hover:text-accent">
              Blog
            </Link>
            <Link to="/" className="text-muted hover:text-accent">
              View store
            </Link>
            <button
              onClick={() => void logout()}
              className="ml-auto font-body text-sm text-muted hover:text-accent"
            >
              Sign out
            </button>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-4">
          <Routes>
            <Route path="/" element={<AdminProducts />} />
            <Route path="/home" element={<AdminHome />} />
            <Route path="/products" element={<AdminProducts />} />
            <Route path="/scent-families" element={<AdminScentFamilies />} />
            <Route path="/orders" element={<AdminOrders />} />
            <Route path="/reviews" element={<AdminReviews />} />
            <Route path="/quiz" element={<AdminQuiz />} />
            <Route path="/banners" element={<AdminBanners />} />
            <Route path="/blog" element={<AdminBlog />} />
          </Routes>
        </main>
      </div>
    </RequireAdmin>
  );
}
