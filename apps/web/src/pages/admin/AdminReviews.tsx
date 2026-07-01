// apps/web/src/pages/admin/AdminReviews.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminFetchReviews, adminModerateReview, adminDeleteReview } from '../../features/admin/adminClient';
import { ApiError } from '../../lib/api';

type StatusFilter = 'pending' | 'approved' | undefined;

export default function AdminReviews() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<StatusFilter>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-reviews', filter],
    queryFn: () => adminFetchReviews(filter),
  });

  const moderateMut = useMutation({
    mutationFn: ({ id, isApproved }: { id: string; isApproved: boolean }) =>
      adminModerateReview(id, isApproved),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-reviews'] });
      void qc.invalidateQueries({ queryKey: ['reviews'] }); // public product reviews
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteReview(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-reviews'] });
      void qc.invalidateQueries({ queryKey: ['reviews'] }); // public product reviews
    },
  });

  const filters: Array<{ label: string; value: StatusFilter }> = [
    { label: 'All', value: undefined },
    { label: 'Pending', value: 'pending' },
    { label: 'Approved', value: 'approved' },
  ];

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl text-content">Reviews</h1>

      <div className="mb-4 flex flex-wrap gap-2 font-body text-sm">
        {filters.map((f) => (
          <button
            key={f.label}
            onClick={() => setFilter(f.value)}
            className={`rounded px-3 py-1 ${
              filter === f.value
                ? 'bg-maroon text-cream'
                : 'border border-line text-muted hover:text-accent'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="font-body text-muted">Loading…</p>}
      {isError && <p className="font-body text-danger">Failed to load reviews.</p>}

      {data && data.items.length === 0 && (
        <p className="font-body text-muted">No reviews found.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full font-body text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">User</th>
                <th className="py-2 pr-4">Rating</th>
                <th className="py-2 pr-4">Body</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((review) => (
                <tr key={review.id} className="text-content">
                  <td className="py-3 pr-4 font-mono text-xs text-muted">{review.productId}</td>
                  <td className="py-3 pr-4">{review.user.name}</td>
                  <td className="py-3 pr-4">{'★'.repeat(review.rating)}</td>
                  <td className="py-3 pr-4 max-w-xs truncate" title={review.body}>
                    {review.body}
                  </td>
                  <td className="py-3 pr-4">
                    <span
                      className={`rounded px-2 py-0.5 text-xs ${
                        review.isApproved
                          ? 'bg-success-soft text-success'
                          : 'bg-warning-soft text-warning'
                      }`}
                    >
                      {review.isApproved ? 'Approved' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          moderateMut.mutate({ id: review.id, isApproved: !review.isApproved })
                        }
                        disabled={moderateMut.isPending}
                        className="rounded border border-line px-2 py-1 text-xs text-content hover:text-accent disabled:opacity-50"
                      >
                        {review.isApproved ? 'Unapprove' : 'Approve'}
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('Delete this review?')) deleteMut.mutate(review.id);
                        }}
                        disabled={deleteMut.isPending}
                        className="rounded border border-line px-2 py-1 text-xs text-danger hover:border-danger disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(moderateMut.isError || deleteMut.isError) && (
        <p className="mt-3 font-body text-sm text-danger">
          {(() => {
            const e = moderateMut.error ?? deleteMut.error;
            return e instanceof ApiError ? `Error ${e.status}: ${e.message}` : 'Action failed. Please try again.';
          })()}
        </p>
      )}
    </div>
  );
}
