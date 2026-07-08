import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { CreateOrderResultDTO } from '@herencia/shared';
import { Price, formatEGP } from '../components/Price';
import { OrderReceipt } from '../components/OrderReceipt';
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
        <div
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${
            isInstapay ? 'bg-warning-soft text-warning' : 'bg-success-soft text-success'
          }`}
        >
          {isInstapay ? '!' : '✓'}
        </div>
        <p className="eyebrow">Thank you</p>
        <h1 className="display text-3xl text-content">
          {isInstapay ? 'One step left — pay to confirm' : 'Order confirmed'}
        </h1>
        <p className="text-muted">
          Order number{' '}
          <span className="rounded-md bg-surface2 px-2 py-0.5 font-medium text-content">{order.orderNumber}</span>
        </p>
        {!isInstapay && (
          <p className="mx-auto max-w-sm text-sm text-muted">
            Estimated delivery: <span className="font-medium text-content">4–5 business days</span> — you pay the courier on arrival.
          </p>
        )}
      </div>

      {isInstapay && (
        <section className="space-y-4 rounded-xl border-2 border-warning bg-warning-soft p-6">
          <p className="text-center font-body text-xs font-semibold uppercase tracking-luxe text-warning">
            Payment required
          </p>
          <p className="text-center text-sm text-content">
            Your order is reserved but <span className="font-semibold">not confirmed</span> until we receive your
            InstaPay transfer.
          </p>
          <ol className="mx-auto max-w-md space-y-3 text-sm text-content">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning font-semibold text-espresso">1</span>
              <span>
                Transfer <span className="font-semibold"><Price value={order.total} /></span> via InstaPay
                {instapay?.handle && (
                  <> to <span className="font-semibold">{instapay.handle}</span></>
                )}
                .
              </span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning font-semibold text-espresso">2</span>
              <span>
                Send the transfer screenshot on{' '}
                <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent underline underline-offset-2">
                  WhatsApp
                </a>{' '}
                so we can ship right away.
              </span>
            </li>
          </ol>
          {instapay?.payLink && (
            <a
              href={instapay.payLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-lux flex w-full justify-center text-base"
            >
              Pay {formatEGP(order.total)} via InstaPay →
            </a>
          )}
          <p className="text-center text-xs text-muted">
            Estimated delivery after payment: 4–5 business days.
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

      {createPortal(<OrderReceipt order={order} instapayHandle={instapay?.handle} />, document.body)}
    </div>
  );
}
