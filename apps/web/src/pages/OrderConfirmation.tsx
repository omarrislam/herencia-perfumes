import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { CreateOrderResultDTO, OrderDTO } from '@herencia/shared';
import { Price, formatEGP } from '../components/Price';
import { fetchSettings } from '../lib/api';

export default function OrderConfirmation() {
  const { state } = useLocation();
  const result = state as CreateOrderResultDTO | null;
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });

  if (!result) {
    return (
      <div className="py-16 text-center font-body space-y-4">
        <p className="text-muted">No order to display.</p>
        <Link to="/" className="inline-block text-accent hover:underline">
          Return to home
        </Link>
      </div>
    );
  }

  const { order, whatsappUrl } = result;
  const isInstapay = order.paymentMethod === 'instapay';
  const instapay = settings.data?.instapay;

  return (
    <div className="mx-auto max-w-xl space-y-8 font-body">
      <div className="space-y-3 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-success-soft text-2xl text-success">
          ✓
        </div>
        <p className="eyebrow">Thank you</p>
        <h1 className="display text-3xl text-content">
          {isInstapay ? 'Order placed' : 'Order confirmed'}
        </h1>
        <p className="text-muted">
          Order number{' '}
          <span className="rounded-md bg-surface2 px-2 py-0.5 font-medium text-content">{order.orderNumber}</span>
        </p>
        <p className="mx-auto max-w-sm text-sm text-muted">
          Estimated delivery: <span className="font-medium text-content">4–5 business days</span>
          {isInstapay ? '' : ' — you pay the courier on arrival.'}
        </p>
      </div>

      {isInstapay && (
        <section className="card-lux space-y-4 rounded-xl p-5 text-center">
          <p className="eyebrow">Complete your payment</p>
          <p className="text-sm text-content">
            Transfer <span className="font-semibold"><Price value={order.total} /></span> via InstaPay
            {instapay?.handle && (
              <>
                {' '}to <span className="font-medium text-accent">{instapay.handle}</span>
              </>
            )}
            .
          </p>
          {instapay?.payLink && (
            <a
              href={instapay.payLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-lux inline-flex w-full justify-center sm:w-auto"
            >
              Pay via InstaPay
            </a>
          )}
          <p className="text-sm text-muted">
            Then send the transfer screenshot on{' '}
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-accent underline-offset-2 hover:underline">
              WhatsApp
            </a>{' '}
            so we can ship your order right away.
          </p>
        </section>
      )}

      <section className="card-lux space-y-3 rounded-xl p-5">
        <p className="eyebrow">Summary</p>
        <ul className="space-y-1.5 text-sm">
          {order.items.map((item) => (
            <li key={`${item.product}-${item.sizeLabel}`} className="flex items-center justify-between gap-3 text-content">
              <span className="min-w-0 truncate">
                {item.name} × {item.qty} <span className="text-muted">({item.sizeLabel})</span>
              </span>
              <Price value={item.unitPrice * item.qty} />
            </li>
          ))}
        </ul>
        <div className="space-y-1 border-t border-hairline pt-3 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <Price value={order.subtotal} />
          </div>
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
          <div className="flex justify-between font-semibold text-content">
            <span>Total{isInstapay ? ' to transfer' : ' due on delivery'}</span>
            <Price value={order.total} />
          </div>
        </div>
      </section>

      <div className="space-y-3 text-center">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link to="/products" className="btn-lux inline-flex justify-center">
            Continue shopping
          </Link>
          <button type="button" onClick={() => window.print()} className="btn-outline inline-flex justify-center">
            Download receipt (PDF)
          </button>
        </div>
        {!isInstapay && (
          <p className="text-sm text-muted">
            Questions about your order?{' '}
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="text-accent underline-offset-2 hover:underline">
              Chat with us on WhatsApp
            </a>
          </p>
        )}
      </div>

      {createPortal(<Receipt order={order} instapayHandle={instapay?.handle} />, document.body)}
    </div>
  );
}

// Print-only branded receipt (hidden on screen; the print stylesheet hides the
// app and shows only this — "Download receipt" simply triggers window.print()).
function Receipt({ order, instapayHandle }: { order: OrderDTO; instapayHandle?: string }) {
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
