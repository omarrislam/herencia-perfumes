// apps/web/src/pages/admin/AdminDashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchProducts } from '../../lib/api';
import { adminFetchOrders } from '../../features/admin/adminClient';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning-soft text-warning',
  confirmed: 'bg-info-soft text-info',
  shipped: 'bg-info-soft text-info',
  delivered: 'bg-success-soft text-success',
  cancelled: 'bg-danger-soft text-danger',
};

function egp(n: number) {
  return `EGP ${n.toLocaleString()}`;
}

function StatCard({ label, value, hint, to }: { label: string; value: string; hint?: string; to?: string }) {
  const body = (
    <div className="rounded-xl border border-hairline bg-surface p-5">
      <p className="font-body text-xs uppercase tracking-[0.15em] text-muted">{label}</p>
      <p className="mt-2 font-display text-3xl text-content">{value}</p>
      {hint && <p className="mt-1 font-body text-xs text-muted">{hint}</p>}
    </div>
  );
  return to ? <Link to={to} className="block transition-colors hover:border-accent">{body}</Link> : body;
}

export default function AdminDashboard() {
  const orders = useQuery({ queryKey: ['admin-orders'], queryFn: () => adminFetchOrders() });
  const pending = useQuery({ queryKey: ['admin-orders', 'pending'], queryFn: () => adminFetchOrders('pending') });
  const products = useQuery({ queryKey: ['admin-products'], queryFn: () => fetchProducts({ limit: 48 }) });

  const orderItems = orders.data?.items ?? [];
  const revenue = orderItems.filter((o) => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
  const productItems = products.data?.items ?? [];
  const lowStock = productItems.filter((p) => p.sizes.some((s) => s.stock > 0 && s.stock <= 5)).length;
  const outOfStock = productItems.filter((p) => p.sizes.every((s) => s.stock === 0)).length;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-content">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Orders" value={String(orders.data?.total ?? 0)} to="/admin/orders" />
        <StatCard label="Pending" value={String(pending.data?.total ?? 0)} hint="Awaiting action" to="/admin/orders" />
        <StatCard label="Revenue" value={egp(revenue)} hint="From recent orders" />
        <StatCard label="Products" value={String(products.data?.total ?? 0)} to="/admin/products" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Low stock" value={String(lowStock)} hint="≤ 5 left" to="/admin/inventory" />
        <StatCard label="Out of stock" value={String(outOfStock)} to="/admin/inventory" />
      </div>

      {/* Recent orders */}
      <section className="rounded-xl border border-hairline bg-surface">
        <div className="flex items-center justify-between border-b border-hairline px-5 py-4">
          <h2 className="font-display text-lg text-content">Recent orders</h2>
          <Link to="/admin/orders" className="font-body text-sm text-accent hover:underline">View all</Link>
        </div>
        {orders.isLoading ? (
          <p className="px-5 py-6 font-body text-sm text-muted">Loading…</p>
        ) : orderItems.length === 0 ? (
          <p className="px-5 py-6 font-body text-sm text-muted">No orders yet.</p>
        ) : (
          <div className="divide-y divide-hairline">
            {orderItems.slice(0, 6).map((o) => (
              <div key={o.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate font-body text-sm text-content">{o.orderNumber} · {o.customer.name}</p>
                  <p className="font-body text-xs text-muted">{new Date(o.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="font-body text-sm text-content">{egp(o.total)}</span>
                  <span className={`rounded px-2 py-0.5 font-body text-xs capitalize ${STATUS_COLORS[o.status] ?? 'bg-surface2 text-muted'}`}>{o.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
