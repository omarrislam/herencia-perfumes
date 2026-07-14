// apps/web/src/pages/admin/AdminInventory.tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchProducts, fetchSettings } from '../../lib/api';

type Row = { id: string; name: string; type: string; size: string; price: number; stock: number };

function statusOf(stock: number) {
  if (stock === 0) return { label: 'Out', cls: 'bg-danger-soft text-danger' };
  if (stock <= 5) return { label: 'Low', cls: 'bg-warning-soft text-warning' };
  return { label: 'In stock', cls: 'bg-success-soft text-success' };
}

export default function AdminInventory() {
  const products = useQuery({ queryKey: ['admin-products'], queryFn: () => fetchProducts({ limit: 48 }) });
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings, staleTime: 60_000 });
  const samplePrice = settings.data?.samples.price ?? 60;

  const rows: Row[] = (products.data?.items ?? []).flatMap((p) => [
    ...p.sizes.map((s) => ({ id: p.id, name: p.name, type: p.type, size: s.label, price: s.price, stock: s.stock })),
    ...(p.type === 'perfume' && p.sampleStock > 0
      ? [{ id: p.id, name: p.name, type: p.type, size: 'Sample', price: samplePrice, stock: p.sampleStock }]
      : []),
  ]);
  rows.sort((a, b) => a.stock - b.stock); // surface low stock first

  const units = rows.reduce((sum, r) => sum + r.stock, 0);
  const low = rows.filter((r) => r.stock > 0 && r.stock <= 5).length;
  const out = rows.filter((r) => r.stock === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl text-content">Inventory</h1>
        <Link to="/admin/products" className="font-body text-sm text-accent hover:underline">Edit products →</Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-hairline bg-surface p-4"><p className="font-body text-xs uppercase tracking-wide text-muted">SKUs</p><p className="mt-1 font-display text-2xl text-content">{rows.length}</p></div>
        <div className="rounded-xl border border-hairline bg-surface p-4"><p className="font-body text-xs uppercase tracking-wide text-muted">Units</p><p className="mt-1 font-display text-2xl text-content">{units}</p></div>
        <div className="rounded-xl border border-hairline bg-surface p-4"><p className="font-body text-xs uppercase tracking-wide text-muted">Low</p><p className="mt-1 font-display text-2xl text-warning">{low}</p></div>
        <div className="rounded-xl border border-hairline bg-surface p-4"><p className="font-body text-xs uppercase tracking-wide text-muted">Out</p><p className="mt-1 font-display text-2xl text-danger">{out}</p></div>
      </div>

      <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
        <table className="w-full text-left">
          <thead className="border-b border-hairline bg-surface2">
            <tr className="font-body text-xs uppercase tracking-wide text-muted">
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Size</th>
              <th className="hidden px-4 py-3 sm:table-cell">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {products.isLoading ? (
              <tr><td colSpan={5} className="px-4 py-6 font-body text-sm text-muted">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-6 font-body text-sm text-muted">No products yet.</td></tr>
            ) : (
              rows.map((r, i) => {
                const st = statusOf(r.stock);
                return (
                  <tr key={`${r.id}-${r.size}-${i}`} className="font-body text-sm text-content">
                    <td className="px-4 py-3">{r.name}<span className="ml-2 text-xs capitalize text-muted">{r.type}</span></td>
                    <td className="px-4 py-3 text-muted">{r.size}</td>
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">EGP {r.price.toLocaleString()}</td>
                    <td className="px-4 py-3">{r.stock}</td>
                    <td className="px-4 py-3"><span className={`rounded px-2 py-0.5 text-xs ${st.cls}`}>{st.label}</span></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
