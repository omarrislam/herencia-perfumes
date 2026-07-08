// apps/web/src/pages/admin/AdminOrders.tsx
import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OrderDTO, OrderStatus } from '@herencia/shared';
import { ORDER_STATUS, ORDER_STATUS_TRANSITIONS } from '@herencia/shared';
import { adminFetchOrders, adminUpdateOrderStatus, adminDeleteOrder } from '../../features/admin/adminClient';
import { Price } from '../../components/Price';
import { OrderReceipt } from '../../components/OrderReceipt';

export default function AdminOrders() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<OrderStatus | undefined>(undefined);
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-orders', filter],
    queryFn: () => adminFetchOrders(filter),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      adminUpdateOrderStatus(id, status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => adminDeleteOrder(id),
    onSuccess: () => {
      setOpenId(null);
      void qc.invalidateQueries({ queryKey: ['admin-orders'] });
    },
  });

  const handleDelete = (order: OrderDTO) => {
    if (window.confirm(`Delete order ${order.orderNumber} permanently? This cannot be undone.`)) {
      deleteMut.mutate(order.id);
    }
  };

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl text-content">Orders</h1>

      {/* Status filter buttons */}
      <div className="mb-4 flex flex-wrap gap-2 font-body text-sm">
        <button
          onClick={() => setFilter(undefined)}
          className={`rounded px-3 py-1 ${filter === undefined ? 'bg-maroon text-cream' : 'border border-line text-muted hover:text-accent'}`}
        >
          All
        </button>
        {ORDER_STATUS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded px-3 py-1 capitalize ${filter === s ? 'bg-maroon text-cream' : 'border border-line text-muted hover:text-accent'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading && <p className="font-body text-muted">Loading…</p>}
      {isError && <p className="font-body text-danger">Failed to load orders.</p>}

      {data && data.items.length === 0 && (
        <p className="font-body text-muted">No orders found.</p>
      )}

      {data && data.items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full font-body text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="py-2 pr-4">Order</th>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Total</th>
                <th className="py-2 pr-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {data.items.map((order) => {
                const transitions = ORDER_STATUS_TRANSITIONS[order.status];
                const options: OrderStatus[] = [order.status, ...transitions];
                const open = openId === order.id;
                return [
                  <tr
                    key={order.id}
                    onClick={() => setOpenId(open ? null : order.id)}
                    aria-expanded={open}
                    className="cursor-pointer text-content transition-colors hover:bg-surface2"
                  >
                    <td className="py-3 pr-4">
                      <span className={`mr-2 inline-block text-xs text-muted transition-transform ${open ? 'rotate-90' : ''}`}>▸</span>
                      {order.orderNumber}
                    </td>
                    <td className="py-3 pr-4 text-muted">
                      {new Date(order.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 pr-4">{order.customer.name}</td>
                    <td className="py-3 pr-4">
                      <Price value={order.total} />
                    </td>
                    <td className="py-3 pr-4" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={order.status}
                        aria-label={`Order ${order.orderNumber} status`}
                        disabled={transitions.length === 0 || statusMut.isPending}
                        onChange={(e) =>
                          statusMut.mutate({ id: order.id, status: e.target.value as OrderStatus })
                        }
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
                      <td colSpan={5} className="bg-surface2 px-4 py-4">
                        <OrderDetails
                          order={order}
                          onDelete={() => handleDelete(order)}
                          deleting={deleteMut.isPending}
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

      {statusMut.isError && (
        <p className="mt-3 font-body text-sm text-danger">Status update failed.</p>
      )}
      {deleteMut.isError && (
        <p className="mt-3 font-body text-sm text-danger">Delete failed.</p>
      )}
    </div>
  );
}

function OrderDetails({ order, onDelete, deleting }: { order: OrderDTO; onDelete: () => void; deleting: boolean }) {
  const addr = order.shippingAddress;
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
          <p className="capitalize text-content">{order.paymentMethod === 'instapay' ? 'InstaPay' : 'Cash on delivery'}</p>
          <p className="text-muted">
            Placed {new Date(order.createdAt).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
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
