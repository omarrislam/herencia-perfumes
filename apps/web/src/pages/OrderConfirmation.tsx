import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import type { CreateOrderResultDTO } from '@herencia/shared';
import { Price } from '../components/Price';
import { cld } from '../lib/cloudinary';
import { fetchSettings } from '../lib/api';

const QR_FALLBACK = '/instapay-qr.jpg';

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
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-accent text-2xl text-accent">
          ✓
        </div>
        <p className="eyebrow">Thank you</p>
        <h1 className="display text-3xl text-content">Order confirmed</h1>
        <p className="text-muted">
          Order number{' '}
          <span className="rounded-md bg-surface2 px-2 py-0.5 font-medium text-content">{order.orderNumber}</span>
        </p>
      </div>

      <section className="card-lux space-y-3 rounded-xl p-5">
        <p className="eyebrow">Summary</p>
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

      {isInstapay && (
        <section className="card-lux space-y-3 rounded-xl p-5">
          <p className="eyebrow">Pay via InstaPay</p>
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:text-left">
            <img
              src={instapay?.qrImage ? cld(instapay.qrImage, { w: 320 }) : QR_FALLBACK}
              alt="InstaPay QR code"
              className="h-40 w-40 flex-shrink-0 rounded-lg border border-hairline bg-surface object-contain p-2"
            />
            <div className="space-y-1.5 text-center text-sm sm:text-left">
              <p className="text-content">Transfer <span className="font-semibold"><Price value={order.total} /></span> to:</p>
              <p className="font-medium text-accent">{instapay?.handle ?? 'omarislamelsady@instapay'}</p>
              <p className="text-muted">Then send the transfer screenshot to us on WhatsApp to confirm your order.</p>
            </div>
          </div>
        </section>
      )}

      <div className="text-center space-y-3">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-md bg-[#25D366] px-6 py-3 font-body text-sm font-semibold text-white hover:bg-[#1fb558] transition-colors"
        >
          {isInstapay ? 'Send screenshot on WhatsApp' : 'Confirm on WhatsApp'}
        </a>
        <p className="text-sm text-muted">
          {isInstapay
            ? 'Send your InstaPay transfer screenshot on WhatsApp to complete your order.'
            : 'Please confirm your order via WhatsApp to proceed.'}
        </p>
      </div>

      <div className="text-center">
        <Link to="/" className="link-underline text-sm text-accent">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
