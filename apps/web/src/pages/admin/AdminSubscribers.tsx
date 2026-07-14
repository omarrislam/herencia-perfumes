import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminFetchSubscribers } from '../../features/admin/adminClient';

// Newsletter emails captured by the discount popup — viewable and exportable.
export default function AdminSubscribers() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-subscribers', page],
    queryFn: () => adminFetchSubscribers(page),
  });

  const exportCsv = () => {
    if (!data) return;
    const rows = data.items.map((s) => `"${s.email.replace(/"/g, '""')}","${s.source}","${s.createdAt}"`);
    const blob = new Blob([['email,source,subscribedAt', ...rows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'herencia-subscribers.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl text-content">Subscribers</h1>
        <button
          type="button"
          onClick={exportCsv}
          disabled={!data || data.items.length === 0}
          className="rounded border border-line px-3 py-1.5 font-body text-sm text-content transition-colors hover:border-accent hover:text-accent disabled:opacity-40"
        >
          Export CSV
        </button>
      </div>

      {isLoading && <p className="font-body text-muted">Loading…</p>}
      {isError && <p className="font-body text-danger">Failed to load subscribers.</p>}
      {data && data.items.length === 0 && (
        <p className="font-body text-muted">No subscribers yet — they arrive via the email popup on the storefront.</p>
      )}

      {data && data.items.length > 0 && (
        <>
          <p className="mb-3 font-body text-sm text-muted">{data.total} total</p>
          <table className="w-full font-body text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 pr-4">Email</th>
                <th className="py-2 pr-4">Source</th>
                <th className="py-2 pr-4">Subscribed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line text-content">
              {data.items.map((s) => (
                <tr key={s.id}>
                  <td className="py-2.5 pr-4">{s.email}</td>
                  <td className="py-2.5 pr-4 capitalize text-muted">{s.source}</td>
                  <td className="py-2.5 pr-4 text-muted">
                    {new Date(s.createdAt).toLocaleDateString('en-GB', { dateStyle: 'medium' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
