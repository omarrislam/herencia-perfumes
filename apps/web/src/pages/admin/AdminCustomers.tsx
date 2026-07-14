import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetchCustomers } from '../../features/admin/adminClient';
import { Price } from '../../components/Price';

// Registered customers with their (non-cancelled) order counts and totals.
export default function AdminCustomers() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-customers', page],
    queryFn: () => adminFetchCustomers(page),
  });

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl text-content">Customers</h1>

      {isLoading && <p className="font-body text-muted">Loading…</p>}
      {isError && <p className="font-body text-danger">Failed to load customers.</p>}
      {data && data.items.length === 0 && (
        <p className="font-body text-muted">No registered customers yet. Guest orders don’t appear here — see Orders.</p>
      )}

      {data && data.items.length > 0 && (
        <>
          <p className="mb-3 font-body text-sm text-muted">{data.total} registered</p>
          <div className="overflow-x-auto">
            <table className="w-full font-body text-sm">
              <thead>
                <tr className="border-b border-line text-left text-muted">
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Phone</th>
                  <th className="py-2 pr-4">Joined</th>
                  <th className="py-2 pr-4 text-right">Orders</th>
                  <th className="py-2 pr-4 text-right">Total spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line text-content">
                {data.items.map((c) => (
                  <tr key={c.id}>
                    <td className="py-2.5 pr-4">{c.name}</td>
                    <td className="py-2.5 pr-4 text-muted">{c.email}</td>
                    <td className="py-2.5 pr-4 text-muted">{c.phone ?? '—'}</td>
                    <td className="py-2.5 pr-4 text-muted">
                      {new Date(c.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                    </td>
                    <td className="py-2.5 pr-4 text-right">{c.orderCount}</td>
                    <td className="py-2.5 pr-4 text-right"><Price value={c.totalSpent} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.pages > 1 && (
            <div className="mt-4 flex items-center justify-between font-body text-sm text-muted">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="rounded border border-line px-3 py-1 hover:text-accent disabled:opacity-40">← Previous</button>
              <span>Page {data.page} of {data.pages}</span>
              <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="rounded border border-line px-3 py-1 hover:text-accent disabled:opacity-40">Next →</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
