import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createOrderSchema, type CreateOrderInput, type CreateOrderResultDTO, type PaymentMethod, SAMPLE_PRODUCT } from '@herencia/shared';
import { useCart } from '../features/cart/CartContext';
import { useSamples } from '../features/samples/SampleContext';
import { useAuth } from '../features/auth/AuthContext';
import { DISCOUNT_KEY } from '../components/EmailPopup';
import { Price } from '../components/Price';
import { Button } from '../components/Button';
import * as api from '../lib/api';

type FormState = {
  name: string;
  phone: string;
  email: string;
  line1: string;
  city: string;
  governorate: string;
  notes: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export default function Checkout() {
  const { items, priced, clear } = useCart();
  const { samples, clear: clearSamples } = useSamples();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(() => ({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    line1: '',
    city: '',
    governorate: '',
    notes: '',
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const settings = useQuery({ queryKey: ['settings'], queryFn: api.fetchSettings });

  // Prefill the delivery address from the account's saved addresses (default
  // first) — only into fields the user hasn't typed in yet.
  const addresses = useQuery({ queryKey: ['account', 'addresses'], queryFn: api.fetchAddresses, enabled: !!user });
  useEffect(() => {
    const addr = addresses.data?.find((a) => a.isDefault) ?? addresses.data?.[0];
    if (!addr) return;
    setForm((prev) => ({
      ...prev,
      line1: prev.line1 || addr.line1,
      city: prev.city || addr.city,
      governorate: prev.governorate || addr.governorate,
      phone: prev.phone || addr.phone,
    }));
  }, [addresses.data]);
  const instapayOn = !!settings.data?.instapay?.enabled;
  const [payment, setPayment] = useState<PaymentMethod>('cod');
  const [discountCode, setDiscountCode] = useState<string>(() => {
    try { return localStorage.getItem(DISCOUNT_KEY) ?? ''; } catch { return ''; }
  });
  const [showCodeField, setShowCodeField] = useState(false);

  // Client-side preview only — the server re-validates the code and recomputes the total.
  const popup = settings.data?.emailPopup;
  const codeValid =
    !!popup?.enabled && !!popup.code && !!popup.discountPercent &&
    discountCode.trim().toUpperCase() === popup.code.trim().toUpperCase();
  const discount = codeValid && priced ? round2(priced.subtotal * (popup!.discountPercent! / 100)) : 0;
  const totalDue = priced ? round2(priced.total - discount) : 0;

  const update =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  if (items.length === 0) {
    return (
      <div className="py-16 text-center font-body">
        <p className="text-muted">Your cart is empty.</p>
      </div>
    );
  }

  const disabled = !!priced?.hasUnavailable || submitting;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const input: CreateOrderInput = {
      items,
      customer: {
        name: form.name,
        phone: form.phone,
        ...(form.email ? { email: form.email } : {}),
      },
      shippingAddress: {
        line1: form.line1,
        city: form.city,
        governorate: form.governorate,
        phone: form.phone,
      },
      ...((() => {
        const sampleNote =
          priced?.items.some((i) => i.slug === SAMPLE_PRODUCT.slug) && samples.length > 0
            ? `Samples (${samples.length} × 2ml): ${samples.map((s) => s.name).join(', ')}`
            : '';
        const notes = [sampleNote, form.notes].filter(Boolean).join('\n');
        return notes ? { notes } : {};
      })()),
      paymentMethod: instapayOn ? payment : 'cod',
      ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
    };

    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? 'Invalid input');
      return;
    }

    setSubmitting(true);
    try {
      const result: CreateOrderResultDTO = await api.createOrder(parsed.data);
      clear();
      clearSamples();
      try { localStorage.removeItem(DISCOUNT_KEY); } catch { /* private mode */ }
      navigate('/order-confirmation', { state: result, replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const summary = (
    <section className="card-lux space-y-3 rounded-xl p-5">
      <p className="eyebrow">Order summary</p>
      {priced && (
        <>
          <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
            {priced.items.map((item) => (
              <li
                key={`${item.productId}-${item.sizeLabel}`}
                className="flex items-center justify-between gap-3 font-body text-sm text-content"
              >
                <span className="min-w-0 truncate">
                  {item.name} × {item.qty} <span className="text-muted">({item.sizeLabel})</span>
                </span>
                <Price value={item.lineTotal} />
              </li>
            ))}
          </ul>
          <div className="space-y-1.5 border-t border-hairline pt-3 font-body text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <Price value={priced.subtotal} />
            </div>
            <div className="flex justify-between text-muted">
              <span>Shipping</span>
              {priced.shipping === 0 ? <span className="text-success">Free</span> : <Price value={priced.shipping} />}
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-success">
                <span>Discount ({popup!.discountPercent}% · {popup!.code})</span>
                <span>−<Price value={discount} /></span>
              </div>
            )}
            <div className="flex justify-between pt-1 text-base font-medium text-content">
              <span>Total</span>
              <Price value={totalDue} />
            </div>
          </div>
          {/* Discount code — auto-filled from the email popup, or entered manually */}
          {!codeValid && (
            showCodeField ? (
              <div className="flex items-center gap-2 pt-1">
                <label htmlFor="checkout-code" className="sr-only">Discount code</label>
                <input
                  id="checkout-code"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  placeholder="Discount code"
                  className="field-lux flex-1 text-sm uppercase"
                />
                {discountCode.trim() && (
                  <span className="font-body text-xs text-danger">Invalid code</span>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => setShowCodeField(true)} className="font-body text-xs text-muted underline-offset-2 hover:text-accent hover:underline">
                Have a discount code?
              </button>
            )
          )}
        </>
      )}
    </section>
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <p className="eyebrow">Almost there</p>
        <h1 className="display mt-1 text-3xl text-content">Checkout</h1>
        <div className="rule-gold-left mt-3" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_360px] lg:gap-10">
        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          <section className="space-y-3">
            <h2 className="font-display text-lg text-content">Your details</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField id="checkout-name" label="Full name" autoComplete="name" value={form.name} onChange={update('name')} required />
              <InputField id="checkout-phone" label="Phone" type="tel" autoComplete="tel" value={form.phone} onChange={update('phone')} required />
            </div>
            <InputField
              id="checkout-email"
              label="Email (optional)"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
            />
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg text-content">Delivery address</h2>
            <InputField
              id="checkout-line1"
              label="Address"
              autoComplete="street-address"
              value={form.line1}
              onChange={update('line1')}
              required
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField id="checkout-city" label="City" autoComplete="address-level2" value={form.city} onChange={update('city')} required />
              <InputField
                id="checkout-governorate"
                label="Governorate"
                value={form.governorate}
                onChange={update('governorate')}
                required
              />
            </div>
            <div>
              <label htmlFor="checkout-notes" className="mb-1.5 block font-body text-sm text-muted">
                Delivery notes (optional)
              </label>
              <textarea
                id="checkout-notes"
                value={form.notes}
                onChange={update('notes')}
                rows={2}
                className="field-lux text-sm"
              />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="font-display text-lg text-content">Payment</h2>
            {instapayOn ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {([
                  ['cod', 'Cash on delivery', 'Pay when your order arrives.'],
                  ['instapay', 'InstaPay', 'Payment link shown after you place the order.'],
                ] as const).map(([method, title, hint]) => {
                  const selected = payment === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPayment(method)}
                      aria-pressed={selected}
                      className={`relative rounded-xl border-2 p-4 text-left transition-colors ${selected ? 'border-success bg-success-soft' : 'border-line hover:border-accent'}`}
                    >
                      <span
                        aria-hidden="true"
                        className={`absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full text-xs transition-opacity ${selected ? 'bg-success text-cream opacity-100' : 'opacity-0'}`}
                      >
                        ✓
                      </span>
                      <span className="block pr-7 font-body text-sm font-medium text-content">{title}</span>
                      <span className="mt-0.5 block font-body text-xs text-muted">{hint}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-line p-4 font-body text-sm text-muted">
                <span className="font-medium text-content">Cash on delivery</span> — pay when your order arrives.
              </p>
            )}
          </section>

          {formError && <p className="font-body text-sm text-danger">{formError}</p>}

          <Button type="submit" disabled={disabled} className="w-full py-3">
            {submitting ? 'Placing order…' : 'Place order'}
          </Button>
          <p className="text-center font-body text-xs text-muted">
            Delivery in 4–5 business days · Free returns on unopened items
          </p>
        </form>

        <div className="order-first lg:order-none lg:sticky lg:top-24">{summary}</div>
      </div>
    </div>
  );
}

function InputField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="mb-1.5 block font-body text-sm text-muted">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        required={required}
        className="field-lux text-sm"
      />
    </div>
  );
}
