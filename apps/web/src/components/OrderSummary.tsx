import type { OrderDTO } from '@herencia/shared';
import { Price } from './Price';

// Shared by the account order history and the guest /track page so a customer
// sees exactly the same detail whether or not they have an account.

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning-soft text-warning',
  confirmed: 'bg-info-soft text-info',
  shipped: 'bg-accent/15 text-accent',
  delivered: 'bg-success-soft text-success',
  cancelled: 'bg-danger-soft text-danger',
};

const STATUS_HINT: Record<string, string> = {
  pending: 'Awaiting your InstaPay transfer — send the screenshot on WhatsApp and we ship right away.',
  confirmed: 'Confirmed and being prepared. Estimated delivery 4–5 business days.',
  shipped: 'On its way to you.',
  delivered: 'Delivered — we hope you love it.',
  cancelled: 'This order was cancelled. Contact us if that looks wrong.',
};

const dt = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' });

export function OrderStatusBadge({ status }: { status: string }) {
  return (
    <span className={`rounded px-2 py-0.5 font-body text-xs capitalize ${ORDER_STATUS_COLORS[status] ?? 'bg-surface2 text-muted'}`}>
      {status}
    </span>
  );
}

export function OrderSummary({ order }: { order: OrderDTO }) {
  const addr = order.shippingAddress;
  const isInstapay = order.paymentMethod === 'instapay';

  return (
    <div className="space-y-5 font-body text-sm">
      <p className="text-muted">{STATUS_HINT[order.status]}</p>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted">Items</p>
        <ul className="divide-y divide-hairline rounded-lg border border-hairline">
          {order.items.map((item, i) => (
            <li key={`${item.product}-${item.sizeLabel}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate text-content">
                {item.name} × {item.qty} <span className="text-muted">({item.sizeLabel})</span>
              </span>
              <Price value={item.unitPrice * item.qty} />
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <p className="mb-2 text-xs uppercase tracking-wide text-muted">Delivering to</p>
          <p className="text-content">{order.customer.name}</p>
          <p className="text-muted">{addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}</p>
          <p className="text-muted">{addr.city}, {addr.governorate}</p>
          <p className="text-muted">{addr.phone}</p>
        </div>
        <div className="space-y-1">
          <p className="mb-2 text-xs uppercase tracking-wide text-muted">Payment</p>
          <div className="flex justify-between text-muted"><span>Subtotal</span><Price value={order.subtotal} /></div>
          <div className="flex justify-between text-muted">
            <span>Shipping</span>
            {order.shipping === 0 ? <span className="text-success">Free</span> : <Price value={order.shipping} />}
          </div>
          {order.discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Discount{order.discountCode ? ` (${order.discountCode})` : ''}</span>
              <span>−<Price value={order.discount} /></span>
            </div>
          )}
          <div className="flex justify-between border-t border-hairline pt-1 font-medium text-content">
            <span>
              {isInstapay ? (order.paidAt ? 'Paid' : 'To transfer') : 'Due on delivery'}
            </span>
            <Price value={order.total} />
          </div>
          <p className="pt-1 text-xs text-muted">
            {isInstapay
              ? order.paidAt
                ? `InstaPay — received ${dt(order.paidAt)}`
                : 'InstaPay — payment not received yet'
              : 'Cash on delivery'}
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs uppercase tracking-wide text-muted">Progress</p>
        <ul className="space-y-0.5 text-muted">
          <li><span className="text-content">Placed</span> {dt(order.createdAt)}</li>
          {order.statusHistory
            .filter((h) => h.status !== 'pending')
            .map((h) => (
              <li key={`${h.status}-${h.at}`}>
                <span className="capitalize text-content">{h.status}</span> {dt(h.at)}
              </li>
            ))}
        </ul>
      </div>

      {order.notes && (
        <div>
          <p className="mb-1 text-xs uppercase tracking-wide text-muted">Notes</p>
          <p className="whitespace-pre-line text-content">{order.notes}</p>
        </div>
      )}
    </div>
  );
}
