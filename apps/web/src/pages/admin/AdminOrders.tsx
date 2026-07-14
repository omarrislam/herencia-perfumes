// apps/web/src/pages/admin/AdminOrders.tsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OrderDTO, OrderStatus } from '@herencia/shared';
import { ORDER_STATUS, ORDER_STATUS_TRANSITIONS } from '@herencia/shared';
import {
  adminFetchOrders,
  adminUpdateOrderStatus,
  adminMarkOrderPaid,
  adminDeleteOrder,
  adminDownloadOrdersCsv,
} from '../../features/admin/adminClient';
import { Price } from '../../components/Price';
import { OrderReceipt } from '../../components/OrderReceipt';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Hours an order has been awaiting fulfilment (pending or confirmed). */
function pendingAgeHours(order: OrderDTO): number {
  if (order.status !== 'pending' && order.status !== 'confirmed') return 0;
  return Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 3_600_000);
}

function ageLabel(hours: number): string {
  return hours >= 48 ? `${Math.floor(hours / 24)}d` : `${hours}h`;
}

function PaymentBadge({ order }: { order: OrderDTO }) {
  if (order.paymentMethod !== 'instapay') {
    return (
      <span className="rounded border border-line px-2 py-0.5 text-xs text-muted">COD</span>
    );
  }
  return order.paidAt ? (
    <span className="rounded bg-success-soft px-2 py-0.5 text-xs font-medium text-success">
      InstaPay · paid
    </span>
  ) : (
    <span className="rounded bg-warning-soft px-2 py-0.5 text-xs font-medium text-warning">
      InstaPay · unpaid
    </span>
  );
}

export default function AdminOrders() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<OrderStatus | undefined>(undefined);
  const [searchInput, setSearchInput] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-orders', filter, q, page],
    queryFn: () => adminFetchOrders({ status: filter, q, page }),
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['admin-orders'] });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      adminUpdateOrderStatus(id, status),
    onSuccess: invalidate,
  });

  const paidMut = useMutation({
    mutationFn: ({ id, paid }: { id: string; paid: boolean }) => adminMarkOrderPaid(id, paid),
    onSuccess: invalidate,
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteOrder(id),
    onSuccess: () => {
      setOpenId(null);
      invalidate();
    },
  });

  const handleStatusChange = (order: OrderDTO, status: OrderStatus) => {
    if (
      order.paymentMethod === 'instapay' &&
      !order.paidAt &&
      (status === 'confirmed' || status === 'shipped') &&
      !window.confirm(
        `InstaPay payment for ${order.orderNumber} has NOT been marked as received. Move to "${status}" anyway?`,
      )
    ) {
      return;
    }
    statusMut.mutate({ id: order.id, status });
  };

  const handleDelete = (order: OrderDTO) => {
    if (window.confirm(`Delete order ${order.orderNumber} permanently? This cannot be undone.`)) {
      deleteMut.mutate(order.id);
    }
  };

  const setStatusFilter = (s: OrderStatus | undefined) => {
    setFilter(s);
    setPage(1);
  };

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl text-content">Orders</h1>

      {/* Status filter buttons + search */}
      <div className="mb-4 flex flex-wrap items-center gap-2 font-body text-sm">
        <button
          onClick={() => setStatusFilter(undefined)}
          className={`rounded px-3 py-1 ${filter === undefined ? 'bg-maroon text-cream' : 'border border-line text-muted hover:text-accent'}`}
        >
          All
        </button>
        {ORDER_STATUS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded px-3 py-1 capitalize ${filter === s ? 'bg-maroon text-cream' : 'border border-line text-muted hover:text-accent'}`}
          >
            {s}
          </button>
        ))}
        <form
          className="ml-auto flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(searchInput.trim());
            setPage(1);
          }}
        >
          <label htmlFor="order-search" className="sr-only">
            Search orders
          </label>
          <input
            id="order-search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Order no. / name / phone"
            className="w-52 rounded border border-line bg-bg px-2 py-1 text-content placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <button type="submit" className="rounded border border-line px-3 py-1 text-muted hover:text-accent">
            Search
          </button>
          {q && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setQ('');
                setPage(1);
              }}
              className="text-xs text-muted underline-offset-2 hover:text-accent hover:underline"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={() => void adminDownloadOrdersCsv({ status: filter, q })}
            title="Download the current view as CSV"
            className="rounded border border-line px-3 py-1 text-muted hover:text-accent"
          >
            Export CSV
          </button>
        </form>
      </div>

      {isLoading && <p className="font-body text-muted">Loading…</p>}
      {isError && <p className="font-body text-danger">Failed to load orders.</p>}

      {data && data.items.length === 0 && (
        <p className="font-body text-muted">{q ? `No orders match “${q}”.` : 'No orders found.'}</p>
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full font-body text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 pr-4">Order</th>
                <th className="py-2 pr-4">Placed</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Payment</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((order) => {
                const transitions = ORDER_STATUS_TRANSITIONS[order.status];
                const options: OrderStatus[] = [order.status, ...transitions];
                const open = openId === order.id;
                const ageHours = pendingAgeHours(order);
                const stale = ageHours * 3_600_000 >= DAY_MS;
                return [
                  <tr
                    key={order.id}
                    onClick={() => setOpenId(open ? null : order.id)}
                    aria-expanded={open}
                    className={`cursor-pointer text-content transition-colors hover:bg-surface2 ${stale ? 'bg-warning-soft' : ''}`}
                  >
                    <td className="py-3 pr-4">
                      <span className={`mr-2 inline-block text-xs text-muted transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
                      {order.orderNumber}
                      {stale && (
                        <span className="ml-2 rounded bg-warning-soft px-1.5 py-0.5 text-xs font-medium text-warning">
                          waiting {ageLabel(ageHours)}
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-muted">
                      {new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="py-3 pr-4">{order.customer.name}</td>
                    <td className="py-3 pr-4">
                      <Price value={order.total} />
                    </td>
                    <td className="py-3 pr-4">
                      <PaymentBadge order={order} />
                    </td>
                    <td className="py-3 pr-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={order.status}
                        aria-label={`Order ${order.orderNumber} status`}
                        disabled={transitions.length === 0 || statusMut.isPending}
                        onChange={(e) => handleStatusChange(order, e.target.value as OrderStatus)}
                        className="rounded border border-line bg-bg px-2 py-1 capitalize text-content focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {options.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>,
                  open ? (
                    <tr key={`${order.id}-details`}>
                      <td colSpan={6} className="bg-surface2 px-4 py-4">
                        <OrderDetails
                          order={order}
                          onDelete={() => handleDelete(order)}
                          deleting={deleteMut.isPending}
                          onMarkPaid={(paid) => paidMut.mutate({ id: order.id, paid })}
                          markingPaid={paidMut.isPending}
                        />
                      </td>
                    </tr>
                  ) : null,
                ];
              })}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pages > 1 && (
        <div className="mt-4 flex items-center justify-between font-body text-sm text-muted">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded border border-line px-3 py-1 hover:text-accent disabled:opacity-40"
          >
            ← Previous
          </button>
          <span>
            Page {data.page} of {data.pages} · {data.total} orders
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.pages, p + 1))}
            disabled={page >= data.pages}
            className="rounded border border-line px-3 py-1 hover:text-accent disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {statusMut.isError && (
        <p className="mt-3 font-body text-sm text-danger">Status update failed.</p>
      )}
      {paidMut.isError && (
        <p className="mt-3 font-body text-sm text-danger">Payment update failed.</p>
      )}
      {deleteMut.isError && (
        <p className="mt-3 font-body text-sm text-danger">Delete failed.</p>
      )}
    </div>
  );
}

function OrderDetails({
  order,
  onDelete,
  deleting,
  onMarkPaid,
  markingPaid,
}: {
  order: OrderDTO;
  onDelete: () => void;
  deleting: boolean;
  onMarkPaid: (paid: boolean) => void;
  markingPaid: boolean;
}) {
  const addr = order.shippingAddress;
  const isInstapay = order.paymentMethod === 'instapay';
  return (
    <div className="space-y-4 font-body text-sm">
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">Customer</p>
          <p className="text-content">{order.customer.name}</p>
          <p className="text-muted">{order.customer.phone}</p>
          {order.customer.email && <p className="text-muted">{order.customer.email}</p>}
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">Shipping address</p>
          <p className="text-content">{addr.line1}</p>
          {addr.line2 && <p className="text-content">{addr.line2}</p>}
          <p className="text-muted">{addr.city}, {addr.governorate}</p>
          <p className="text-muted">{addr.phone}</p>
        </div>
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">Payment</p>
          <p className="capitalize text-content">{isInstapay ? 'InstaPay' : 'Cash on delivery'}</p>
          {isInstapay && (
            <div className="mt-1 space-y-1">
              {order.paidAt ? (
                <>
                  <p className="text-success">
                    Payment received{' '}
                    {new Date(order.paidAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                  <button
                    type="button"
                    onClick={() => onMarkPaid(false)}
                    disabled={markingPaid}
                    className="text-xs text-muted underline-offset-2 hover:text-accent hover:underline disabled:opacity-50"
                  >
                    Undo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => onMarkPaid(true)}
                  disabled={markingPaid}
                  className="rounded bg-success px-2.5 py-1 text-xs font-medium text-cream transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  {markingPaid ? 'Saving…' : 'Mark payment received'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-muted">Items</p>
        <ul className="divide-y divide-line rounded border border-line">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate text-content">
                {item.name} × {item.qty} <span className="text-muted">({item.sizeLabel})</span>
              </span>
              <Price value={item.unitPrice * item.qty} />
            </li>
          ))}
        </ul>
      </div>

      <div className="max-w-xs space-y-1">
        <div className="flex justify-between text-muted"><span>Subtotal</span><Price value={order.subtotal} /></div>
        <div className="flex justify-between text-muted"><span>Shipping</span><Price value={order.shipping} /></div>
        {order.discount > 0 && (
          <div className="flex justify-between text-success">
            <span>Discount{order.discountCode ? ` (${order.discountCode})` : ''}</span>
            <span>−<Price value={order.discount} /></span>
          </div>
        )}
        <div className="flex justify-between font-medium text-content"><span>Total</span><Price value={order.total} /></div>
      </div>

      {order.notes && (
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">Notes</p>
          <p className="whitespace-pre-line text-content">{order.notes}</p>
        </div>
      )}

      <div>
        <p className="mb-1 text-xs uppercase tracking-wide text-muted">Timeline</p>
        <ul className="space-y-0.5 text-muted">
          <li>
            <span className="text-content">Placed</span>{' '}
            {new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
          </li>
          {order.statusHistory
            .filter((h) => h.status !== 'pending')
            .map((h) => (
              <li key={`${h.status}-${h.at}`}>
                <span className="capitalize text-content">{h.status}</span>{' '}
                {new Date(h.at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
              </li>
            ))}
        </ul>
      </div>

      <div className="flex items-center gap-3 border-t border-line pt-3">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded border border-line px-3 py-1.5 text-content transition-colors hover:border-accent hover:text-accent"
        >
          Print order
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="rounded border border-danger px-3 py-1.5 text-danger transition-colors hover:bg-danger hover:text-cream disabled:opacity-50"
        >
          {deleting ? 'Deleting…' : 'Delete order'}
        </button>
      </div>

      {/* Only the expanded order renders a receipt, so printing targets it. */}
      {createPortal(<OrderReceipt order={order} />, document.body)}
    </div>
  );
}
