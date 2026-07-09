import type { OrderDTO } from '@herencia/shared';
import { formatEGP } from './Price';

// Print-only branded receipt (hidden on screen; the print stylesheet hides the
// app and shows only #receipt — callers render it in a portal and trigger
// window.print()). Used by OrderConfirmation and Admin → Orders.
export function OrderReceipt({ order, instapayHandle }: { order: OrderDTO; instapayHandle?: string }) {
  const date = new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const isInstapay = order.paymentMethod === 'instapay';
  // The courier-facing line: exactly what to collect (or not collect) at the door.
  const collect = isInstapay
    ? order.paidAt
      ? { text: 'PAID VIA INSTAPAY — DO NOT COLLECT', color: '#1d5e2f', bg: '#eaf4ec' }
      : { text: 'INSTAPAY — PAYMENT PENDING', color: '#8a5a00', bg: '#fdf3e0' }
    : { text: `COLLECT ON DELIVERY: ${formatEGP(order.total)}`, color: '#4b1d1d', bg: '#f7ecec' };
  return (
    <div id="receipt" aria-hidden="true">
      <div style={{ fontFamily: 'Jost, sans-serif', color: '#241111', maxWidth: 640, margin: '0 auto', padding: 24 }}>
        <div style={{ textAlign: 'center', borderBottom: '1px solid #d8ccae', paddingBottom: 16 }}>
          <img src="/logo.png" alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, letterSpacing: '0.25em' }}>HERENCIA</div>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#77634d' }}>Heritage Perfumery · Receipt</div>
        </div>

        <div
          style={{
            marginTop: 16,
            padding: '10px 12px',
            textAlign: 'center',
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.06em',
            color: collect.color,
            backgroundColor: collect.bg,
            border: `2px solid ${collect.color}`,
            borderRadius: 6,
          }}
        >
          {collect.text}
        </div>

        <table style={{ width: '100%', fontSize: 12, marginTop: 16 }}>
          <tbody>
            <tr>
              <td style={{ verticalAlign: 'top' }}>
                <strong>Order</strong> {order.orderNumber}<br />
                <strong>Date</strong> {date}<br />
                <strong>Payment</strong> {order.paymentMethod === 'instapay' ? `InstaPay${instapayHandle ? ` (${instapayHandle})` : ''}` : 'Cash on delivery'}
              </td>
              <td style={{ verticalAlign: 'top', textAlign: 'right' }}>
                <strong>{order.customer.name}</strong><br />
                {order.customer.phone}<br />
                {order.customer.email && <>{order.customer.email}<br /></>}
                {order.shippingAddress.line1}, {order.shippingAddress.city}, {order.shippingAddress.governorate}
              </td>
            </tr>
          </tbody>
        </table>

        <table style={{ width: '100%', fontSize: 12, marginTop: 20, borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #241111', textAlign: 'left' }}>
              <th style={{ padding: '6px 0' }}>Item</th>
              <th style={{ padding: '6px 0' }}>Size</th>
              <th style={{ padding: '6px 0', textAlign: 'center' }}>Qty</th>
              <th style={{ padding: '6px 0', textAlign: 'right' }}>Unit</th>
              <th style={{ padding: '6px 0', textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((i) => (
              <tr key={`${i.product}-${i.sizeLabel}`} style={{ borderBottom: '1px solid #e5dcc4' }}>
                <td style={{ padding: '6px 0' }}>{i.name}</td>
                <td style={{ padding: '6px 0' }}>{i.sizeLabel}</td>
                <td style={{ padding: '6px 0', textAlign: 'center' }}>{i.qty}</td>
                <td style={{ padding: '6px 0', textAlign: 'right' }}>{formatEGP(i.unitPrice)}</td>
                <td style={{ padding: '6px 0', textAlign: 'right' }}>{formatEGP(i.unitPrice * i.qty)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <table style={{ width: 260, marginLeft: 'auto', fontSize: 12, marginTop: 12 }}>
          <tbody>
            <tr><td>Subtotal</td><td style={{ textAlign: 'right' }}>{formatEGP(order.subtotal)}</td></tr>
            <tr><td>Shipping</td><td style={{ textAlign: 'right' }}>{order.shipping === 0 ? 'Free' : formatEGP(order.shipping)}</td></tr>
            {order.discount > 0 && (
              <tr><td>Discount{order.discountCode ? ` (${order.discountCode})` : ''}</td><td style={{ textAlign: 'right' }}>−{formatEGP(order.discount)}</td></tr>
            )}
            <tr style={{ fontWeight: 700, borderTop: '1px solid #241111' }}>
              <td style={{ paddingTop: 6 }}>Total{order.paymentMethod === 'instapay' ? '' : ' due on delivery'}</td>
              <td style={{ paddingTop: 6, textAlign: 'right' }}>{formatEGP(order.total)}</td>
            </tr>
          </tbody>
        </table>

        {order.notes && (
          <div style={{ marginTop: 16, padding: '10px 12px', fontSize: 12, border: '1px solid #d8ccae', borderRadius: 6 }}>
            <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: '#77634d', marginBottom: 4 }}>
              Notes
            </div>
            <div style={{ whiteSpace: 'pre-line' }}>{order.notes}</div>
          </div>
        )}

        <p style={{ marginTop: 28, textAlign: 'center', fontSize: 11, color: '#77634d' }}>
          Thank you for choosing HERENCIA — luxury in every drop.<br />
          Estimated delivery: 4–5 business days.
        </p>
      </div>
    </div>
  );
}
