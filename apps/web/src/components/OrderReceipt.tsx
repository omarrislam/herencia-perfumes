import type { OrderDTO } from '@herencia/shared';
import { formatEGP } from './Price';

// Print-only branded receipt (hidden on screen; the print stylesheet hides the
// app and shows only #receipt — callers render it in a portal and trigger
// window.print()). Used by OrderConfirmation and Admin → Orders.
export function OrderReceipt({ order, instapayHandle }: { order: OrderDTO; instapayHandle?: string }) {
  const date = new Date(order.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  return (
    <div id="receipt" aria-hidden="true">
      <div style={{ fontFamily: 'Jost, sans-serif', color: '#241111', maxWidth: 640, margin: '0 auto', padding: 24 }}>
        <div style={{ textAlign: 'center', borderBottom: '1px solid #d8ccae', paddingBottom: 16 }}>
          <img src="/logo.png" alt="" style={{ width: 48, height: 48, objectFit: 'contain' }} />
          <div style={{ fontFamily: 'Cinzel, serif', fontSize: 20, letterSpacing: '0.25em' }}>HERENCIA</div>
          <div style={{ fontSize: 11, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#77634d' }}>Heritage Perfumery · Receipt</div>
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

        <p style={{ marginTop: 28, textAlign: 'center', fontSize: 11, color: '#77634d' }}>
          Thank you for choosing HERENCIA — luxury in every drop.<br />
          Estimated delivery: 4–5 business days.
        </p>
      </div>
    </div>
  );
}
