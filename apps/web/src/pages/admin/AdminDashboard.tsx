// apps/web/src/pages/admin/AdminDashboard.tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { LOW_STOCK_THRESHOLD } from '@herencia/shared';
import { adminFetchOrders, adminFetchStats } from '../../features/admin/adminClient';

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
  const stats = useQuery({ queryKey: ['admin-stats'], queryFn: adminFetchStats });
  const orders = useQuery({ queryKey: ['admin-orders'], queryFn: () => adminFetchOrders() });

  const orderItems = orders.data?.items ?? [];
  // Catalog + stock counts come from the server so they cover every product
  // (including deactivated ones) rather than whatever fitted on one page.
  const s = stats.data;

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl text-content">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Revenue (all time)" value={egp(s?.revenue ?? 0)} hint="Cancelled excluded" />
        <StatCard label="Revenue (30 days)" value={egp(s?.revenue30 ?? 0)} hint={`${s?.orders30 ?? 0} orders`} />
        <StatCard label="Orders" value={String(s?.orders ?? 0)} to="/admin/orders" />
        <StatCard label="To fulfil" value={String(s?.pending ?? 0)} hint="Pending + confirmed" to="/admin/orders" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Products" value={String(s?.products ?? 0)} to="/admin/products" />
        <StatCard label="Low stock" value={String(s?.lowStock ?? 0)} hint={`≤ ${LOW_STOCK_THRESHOLD} left`} to="/admin/inventory" />
        <StatCard label="Out of stock" value={String(s?.outOfStock ?? 0)} hint="Sizes sold out" to="/admin/inventory" />
      </div>

      {/* Best sellers (by units, cancelled orders excluded) */}
      {!!s?.bestSellers.length && (
        <section className="rounded-xl border border-hairline bg-surface">
          <div className="border-b border-hairline px-5 py-4">
            <h2 className="font-display text-lg text-content">Best sellers</h2>
          </div>
          <div className="divide-y divide-hairline">
            {s.bestSellers.map((b, i) => (
              <div key={b.name} className="flex items-center justify-between gap-4 px-5 py-3">
                <p className="min-w-0 truncate font-body text-sm text-content">
                  <span className="mr-2 font-display text-muted">{i + 1}.</span>
                  {b.name}
                </p>
                <p className="shrink-0 font-body text-sm text-muted">
                  {b.qty} sold · <span className="text-content">{egp(b.revenue)}</span>
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

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
