import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { DiscountCodeDTO } from '@herencia/shared';
import {
  adminFetchDiscounts,
  adminCreateDiscount,
  adminUpdateDiscount,
  adminDeleteDiscount,
} from '../../features/admin/adminClient';
import { ApiError } from '../../lib/api';

// Admin-managed discount codes. The email-popup code (Admin → Home) is separate
// and takes precedence when a customer enters it.
export default function AdminDiscounts() {
  const qc = useQueryClient();
  const { data, isLoading, isError } = useQuery({ queryKey: ['admin-discounts'], queryFn: adminFetchDiscounts });

  const [code, setCode] = useState('');
  const [percent, setPercent] = useState('10');
  const [expiresAt, setExpiresAt] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin-discounts'] });

  const createMut = useMutation({
    mutationFn: adminCreateDiscount,
    onSuccess: () => {
      setCode('');
      setPercent('10');
      setExpiresAt('');
      setFormError(null);
      invalidate();
    },
    onError: (e) => setFormError(e instanceof ApiError ? e.message : 'Failed to create the code.'),
  });

  const toggleMut = useMutation({
    mutationFn: (d: DiscountCodeDTO) =>
      adminUpdateDiscount(d.id, { code: d.code, percent: d.percent, isActive: !d.isActive, expiresAt: d.expiresAt ?? null }),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({ mutationFn: adminDeleteDiscount, onSuccess: invalidate });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const pct = Number(percent);
    if (!code.trim() || !Number.isFinite(pct)) {
      setFormError('Enter a code and a percentage.');
      return;
    }
    createMut.mutate({
      code: code.trim().toUpperCase(),
      percent: pct,
      isActive: true,
      expiresAt: expiresAt ? new Date(`${expiresAt}T23:59:59`).toISOString() : null,
    });
  };

  const expired = (d: DiscountCodeDTO) => !!d.expiresAt && new Date(d.expiresAt) <= new Date();

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl text-content">Discount codes</h1>

      <form onSubmit={submit} className="mb-6 flex flex-wrap items-end gap-3 rounded-xl border border-hairline bg-surface p-4">
        <div>
          <label htmlFor="dc-code" className="mb-1 block font-body text-xs uppercase tracking-wide text-muted">Code</label>
          <input id="dc-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="EID25" className="field-lux w-36 text-sm uppercase" />
        </div>
        <div>
          <label htmlFor="dc-percent" className="mb-1 block font-body text-xs uppercase tracking-wide text-muted">Percent</label>
          <input id="dc-percent" type="number" min={1} max={90} value={percent} onChange={(e) => setPercent(e.target.value)} className="field-lux w-24 text-sm" />
        </div>
        <div>
          <label htmlFor="dc-expiry" className="mb-1 block font-body text-xs uppercase tracking-wide text-muted">Expires (optional)</label>
          <input id="dc-expiry" type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="field-lux text-sm" />
        </div>
        <button type="submit" disabled={createMut.isPending} className="btn-lux disabled:opacity-50">
          {createMut.isPending ? 'Creating…' : 'Create code'}
        </button>
        {formError && <p className="w-full font-body text-sm text-danger">{formError}</p>}
      </form>

      {isLoading && <p className="font-body text-muted">Loading…</p>}
      {isError && <p className="font-body text-danger">Failed to load discount codes.</p>}
      {data && data.length === 0 && (
        <p className="font-body text-muted">No codes yet. The email-popup code (Admin → Home) works independently of this list.</p>
      )}

      {data && data.length > 0 && (
        <table className="w-full font-body text-sm">
          <thead>
            <tr className="border-b border-line text-left text-muted">
              <th className="py-2 pr-4">Code</th>
              <th className="py-2 pr-4">Discount</th>
              <th className="py-2 pr-4">Status</th>
              <th className="py-2 pr-4">Expires</th>
              <th className="py-2 pr-4 text-right">Uses</th>
              <th className="py-2 pr-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-line text-content">
            {data.map((d) => (
              <tr key={d.id}>
                <td className="py-2.5 pr-4 font-medium">{d.code}</td>
                <td className="py-2.5 pr-4">{d.percent}%</td>
                <td className="py-2.5 pr-4">
                  {expired(d) ? (
                    <span className="rounded bg-danger-soft px-2 py-0.5 text-xs text-danger">Expired</span>
                  ) : d.isActive ? (
                    <span className="rounded bg-success-soft px-2 py-0.5 text-xs text-success">Active</span>
                  ) : (
                    <span className="rounded bg-surface2 px-2 py-0.5 text-xs text-muted">Paused</span>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-muted">
                  {d.expiresAt ? new Date(d.expiresAt).toLocaleDateString('en-GB', { dateStyle: 'medium' }) : '—'}
                </td>
                <td className="py-2.5 pr-4 text-right">{d.uses}</td>
                <td className="py-2.5 pr-0 text-right">
                  <button
                    type="button"
                    onClick={() => toggleMut.mutate(d)}
                    disabled={toggleMut.isPending}
                    className="mr-3 font-body text-xs text-muted underline-offset-2 hover:text-accent hover:underline disabled:opacity-50"
                  >
                    {d.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.confirm(`Delete code ${d.code}?`) && deleteMut.mutate(d.id)}
                    disabled={deleteMut.isPending}
                    className="font-body text-xs text-danger underline-offset-2 hover:underline disabled:opacity-50"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
