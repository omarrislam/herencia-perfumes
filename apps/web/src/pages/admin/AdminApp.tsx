// apps/web/src/pages/admin/AdminApp.tsx
import { Routes, Route, Link } from 'react-router-dom';
import { AdminTokenGate } from '../../features/admin/AdminTokenGate';
import AdminProducts from './AdminProducts';
import AdminScentFamilies from './AdminScentFamilies';

export default function AdminApp() {
  return (
    <AdminTokenGate>
      <div className="min-h-screen">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 p-4 font-body text-sm">
            <Link to="/admin/products" className="font-display text-lg text-content">
              HERENCIA Admin
            </Link>
            <Link to="/admin/products" className="text-content hover:text-accent">
              Products
            </Link>
            <Link to="/admin/scent-families" className="text-content hover:text-accent">
              Scent families
            </Link>
            <Link to="/" className="ml-auto text-muted hover:text-accent">
              View store
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-4">
          <Routes>
            <Route path="/" element={<AdminProducts />} />
            <Route path="/products" element={<AdminProducts />} />
            <Route path="/scent-families" element={<AdminScentFamilies />} />
          </Routes>
        </main>
      </div>
    </AdminTokenGate>
  );
}
