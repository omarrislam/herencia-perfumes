// apps/web/src/pages/admin/AdminOrders.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { OrderStatus } from '@herencia/shared';
import { ORDER_STATUS, ORDER_STATUS_TRANSITIONS } from '@herencia/shared';
import { adminFetchOrders, adminUpdateOrderStatus } from '../../features/admin/adminClient';
import { Price } from '../../components/Price';

export default function AdminOrders() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<OrderStatus | undefined>(undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-orders', filter],
    queryFn: () => adminFetchOrders(filter),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: OrderStatus }) =>
      adminUpdateOrderStatus(id, status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['admin-orders'] }),
  });

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
      {isError && <p className="font-body text-red-500">Failed to load orders.</p>}

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
                return (
                  <tr key={order.id} className="text-content">
                    <td className="py-3 pr-4">{order.orderNumber}</td>
                    <td className="py-3 pr-4 text-muted">
                      {new Date(order.createdAt).toLocaleDateString('en-GB')}
                    </td>
                    <td className="py-3 pr-4">{order.customer.name}</td>
                    <td className="py-3 pr-4">
                      <Price value={order.total} />
                    </td>
                    <td className="py-3 pr-4">
                      <select
                        value={order.status}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {statusMut.isError && (
        <p className="mt-3 font-body text-sm text-red-500">Status update failed.</p>
      )}
    </div>
  );
}
