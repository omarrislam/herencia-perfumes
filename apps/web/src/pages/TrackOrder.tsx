import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import { trackOrderSchema, type OrderDTO } from '@herencia/shared';
import { OrderSummary, OrderStatusBadge } from '../components/OrderSummary';
import { OrderReceipt } from '../components/OrderReceipt';
import { WhatsAppAsk } from '../components/WhatsAppAsk';
import { Button } from '../components/Button';
import { trackOrder, fetchSettings } from '../lib/api';
import { useSeo } from '../lib/useSeo';

/**
 * Most orders here are placed without an account, so the confirmation screen was
 * the customer's only record — closing that tab lost the order. This page brings
 * it back from the order number plus the phone it was placed with.
 */
export default function TrackOrder() {
  useSeo({
    title: 'Track your order — HERENCIA',
    description: 'Check the status of your HERENCIA order with your order number and phone number.',
  });
  const [params] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(params.get('order') ?? '');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings, staleTime: 60_000 });
  const instapay = settings.data?.instapay;

  const mut = useMutation<OrderDTO, Error, { orderNumber: string; phone: string }>({
    mutationFn: trackOrder,
    onError: (err) => setError(err.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = trackOrderSchema.safeParse({ orderNumber, phone });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Check your details');
      return;
    }
    mut.mutate(parsed.data);
  };

  const order = mut.data;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <p className="eyebrow">Order status</p>
        <h1 className="display mt-2 text-3xl text-content md:text-4xl">Track your order</h1>
        <div className="rule-gold-left mt-4" />
      </div>

      <form onSubmit={submit} className="card-lux space-y-4 rounded-xl p-5">
        <div>
          <label htmlFor="track-order" className="mb-1.5 block font-body text-sm text-muted">
            Order number
          </label>
          <input
            id="track-order"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="HRC-XXXXXXXX-XXXX"
            autoComplete="off"
            className="field-lux text-sm uppercase"
          />
        </div>
        <div>
          <label htmlFor="track-phone" className="mb-1.5 block font-body text-sm text-muted">
            Phone number used on the order
          </label>
          <input
            id="track-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01012345678"
            autoComplete="tel"
            className="field-lux text-sm"
          />
        </div>
        {error && <p className="font-body text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={mut.isPending} className="w-full">
          {mut.isPending ? 'Looking…' : 'Find my order'}
        </Button>
        <p className="text-center font-body text-xs text-muted">
          Your order number is on the confirmation screen and in our WhatsApp message.
        </p>
      </form>

      {order && (
        <section className="card-lux space-y-4 rounded-xl p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="eyebrow">Order</p>
              <p className="font-body font-medium text-content">{order.orderNumber}</p>
            </div>
            <OrderStatusBadge status={order.status} />
          </div>

          <OrderSummary order={order} />

          <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-outline inline-flex justify-center"
            >
              Print receipt
            </button>
            {order.paymentMethod === 'instapay' && !order.paidAt && instapay?.payLink && (
              <a
                href={instapay.payLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-lux inline-flex justify-center"
              >
                Pay via InstaPay →
              </a>
            )}
          </div>
          <WhatsAppAsk
            text={`Hi HERENCIA! I have a question about my order ${order.orderNumber}.`}
            className="text-center"
          />

          {createPortal(<OrderReceipt order={order} instapayHandle={instapay?.handle} />, document.body)}
        </section>
      )}
    </div>
  );
}
