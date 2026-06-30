import { Link, useLocation } from 'react-router-dom';
import type { CreateOrderResultDTO } from '@herencia/shared';
import { Price } from '../components/Price';

export default function OrderConfirmation() {
  const { state } = useLocation();
  const result = state as CreateOrderResultDTO | null;

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

  return (
    <div className="mx-auto max-w-xl space-y-8 py-8 font-body">
      <div className="text-center space-y-2">
        <h1 className="font-display text-3xl text-content">Order Confirmed</h1>
        <p className="text-muted">
          Order number:{' '}
          <span className="font-semibold text-content">{order.orderNumber}</span>
        </p>
      </div>

      <section className="rounded-md border border-line p-4 space-y-3">
        <h2 className="font-display text-lg text-content">Summary</h2>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted">
            <span>Subtotal</span>
            <Price value={order.subtotal} />
          </div>
          <div className="flex justify-between text-muted">
            <span>Shipping</span>
            <Price value={order.shipping} />
          </div>
          <div className="flex justify-between font-semibold text-content">
            <span>Total</span>
            <Price value={order.total} />
          </div>
        </div>
      </section>

      <div className="text-center space-y-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#25D366] px-6 py-3 font-body text-sm font-semibold text-white hover:bg-[#1fb558] transition-colors"
        >
          Confirm on WhatsApp
        </a>
        <p className="text-sm text-muted">
          Please confirm your order via WhatsApp to proceed.
        </p>
      </div>

      <div className="text-center">
        <Link to="/" className="text-sm text-accent hover:underline">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
