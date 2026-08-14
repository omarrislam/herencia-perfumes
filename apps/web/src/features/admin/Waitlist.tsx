import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { StockWaitlistDTO, StockNotificationDTO } from '@herencia/shared';
import { adminFetchWaitlist, adminFetchWaitlistPeople, adminMarkNotified } from './adminClient';
import { customerWhatsAppUrl } from './whatsappMessage';

/**
 * People waiting on a sold-out size.
 *
 * Lives on the Inventory screen on purpose: the moment the owner restocks something
 * is exactly when they need to know who was waiting for it. Nothing sends
 * automatically — each row opens a pre-filled WhatsApp message the owner taps,
 * matching how order receipts already work (decision #48).
 */
function Row({ row }: { row: StockWaitlistDTO }) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const people = useQuery<StockNotificationDTO[]>({
    queryKey: ['admin-waitlist', row.productId, row.sizeLabel],
    queryFn: () => adminFetchWaitlistPeople(row.productId, row.sizeLabel),
    enabled: open,
  });

  const markDone = useMutation({
    mutationFn: (id: string) => adminMarkNotified(id, true),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-waitlist'] });
    },
  });

  const restocked = row.inStock > 0;

  return (
    <>
      <tr className={`border-b border-hairline ${restocked ? 'bg-success-soft/40' : ''}`}>
        <td className="px-4 py-3 font-body text-sm text-content">{row.name}</td>
        <td className="px-4 py-3 font-body text-sm text-muted">{row.sizeLabel}</td>
        <td className="px-4 py-3 text-right font-body text-sm tabular-nums text-content">{row.waiting}</td>
        <td className="px-4 py-3 text-right font-body text-sm tabular-nums">
          {restocked ? (
            <span className="text-success">{row.inStock} in stock — tell them</span>
          ) : (
            <span className="text-muted">out of stock</span>
          )}
        </td>
        <td className="px-4 py-3 text-right">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="font-body text-sm text-accent hover:underline"
          >
            {open ? 'Hide' : 'Show people'}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-hairline bg-surface2/40">
          <td colSpan={5} className="px-4 py-3">
            {people.isLoading && <p className="font-body text-sm text-muted">Loading…</p>}
            {people.data?.length === 0 && <p className="font-body text-sm text-muted">Nobody left to contact.</p>}
            <ul className="space-y-2">
              {people.data?.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 font-body text-sm">
                  <span className="text-content">{p.phone}</span>
                  {p.email && <span className="text-muted">{p.email}</span>}
                  <a
                    href={customerWhatsAppUrl(
                      p.phone,
                      `Hello! ${row.name} (${row.sizeLabel}) is back in stock at HERENCIA. You asked us to let you know.`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-success-soft px-2.5 py-1 text-success hover:underline"
                  >
                    WhatsApp them
                  </a>
                  <button
                    type="button"
                    onClick={() => markDone.mutate(p.id)}
                    disabled={markDone.isPending}
                    className="text-muted hover:text-content hover:underline"
                  >
                    Mark contacted
                  </button>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

export function Waitlist() {
  const q = useQuery<StockWaitlistDTO[]>({ queryKey: ['admin-waitlist'], queryFn: adminFetchWaitlist });

  if (q.isLoading) return null;
  if (!q.data || q.data.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
      <div className="border-b border-hairline bg-surface2 px-4 py-3">
        <h2 className="font-display text-lg text-content">Waiting for a restock</h2>
        <p className="font-body text-xs text-muted">
          People who asked to be told when a sold-out size returns. Restocked rows are highlighted.
        </p>
      </div>
      <table className="w-full text-left">
        <thead className="border-b border-hairline bg-surface2">
          <tr className="font-body text-xs uppercase tracking-wider text-muted">
            <th scope="col" className="px-4 py-2">Product</th>
            <th scope="col" className="px-4 py-2">Size</th>
            <th scope="col" className="px-4 py-2 text-right">Waiting</th>
            <th scope="col" className="px-4 py-2 text-right">Stock</th>
            <th scope="col" className="px-4 py-2" />
          </tr>
        </thead>
        <tbody>
          {q.data.map((row) => (
            <Row key={`${row.productId}-${row.sizeLabel}`} row={row} />
          ))}
        </tbody>
      </table>
    </section>
  );
}
