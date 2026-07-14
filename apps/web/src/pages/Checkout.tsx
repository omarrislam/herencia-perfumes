import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createOrderSchema, type CreateOrderInput, type CreateOrderResultDTO, type PaymentMethod, SAMPLE_SIZE_LABEL, DEFAULT_SAMPLES_SETTINGS } from '@herencia/shared';
import { useCart } from '../features/cart/CartContext';
import { useSamples } from '../features/samples/SampleContext';
import { useAuth } from '../features/auth/AuthContext';
import { DISCOUNT_KEY } from '../components/EmailPopup';
import { Price } from '../components/Price';
import { Button } from '../components/Button';
import { WhatsAppAsk } from '../components/WhatsAppAsk';
import * as api from '../lib/api';
import { useSeo } from '../lib/useSeo';

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

// Maps zod issue paths from createOrderSchema onto checkout form fields.
const PATH_TO_FIELD: Record<string, keyof FormState> = {
  'customer.name': 'name',
  'customer.phone': 'phone',
  'customer.email': 'email',
  'shippingAddress.line1': 'line1',
  'shippingAddress.city': 'city',
  'shippingAddress.governorate': 'governorate',
  'shippingAddress.phone': 'phone',
  notes: 'notes',
};

// Focus order when several fields are invalid at once.
const FIELD_ORDER: (keyof FormState)[] = ['name', 'phone', 'email', 'line1', 'city', 'governorate', 'notes'];

// All 27 Egyptian governorates — a select prevents the courier misroutes that
// free-text spelling caused.
const GOVERNORATES = [
  'Cairo', 'Giza', 'Alexandria', 'Qalyubia', 'Sharqia', 'Dakahlia', 'Beheira',
  'Kafr El Sheikh', 'Gharbia', 'Monufia', 'Damietta', 'Port Said', 'Ismailia',
  'Suez', 'North Sinai', 'South Sinai', 'Beni Suef', 'Faiyum', 'Minya',
  'Assiut', 'Sohag', 'Qena', 'Luxor', 'Aswan', 'Red Sea', 'New Valley', 'Matrouh',
];

export default function Checkout() {
  useSeo({ title: 'Checkout — HERENCIA' });
  const { items, priced, clear } = useCart();
  const { clear: clearSamples } = useSamples();
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
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
  const popupValid =
    !!popup?.enabled && !!popup.code && !!popup.discountPercent &&
    discountCode.trim().toUpperCase() === popup.code.trim().toUpperCase();
  // Admin-managed codes: preview via the public lookup (popup code wins).
  const codeQuery = useQuery({
    queryKey: ['discount', discountCode.trim().toUpperCase()],
    queryFn: () => api.checkDiscountCode(discountCode.trim()),
    enabled: !popupValid && discountCode.trim().length >= 2,
    retry: false,
    staleTime: 60_000,
  });
  const percent = popupValid ? popup!.discountPercent! : codeQuery.data?.percent;
  const codeValid = popupValid || !!codeQuery.data;
  const discount = codeValid && percent && priced ? round2(priced.subtotal * (percent / 100)) : 0;
  const totalDue = priced ? round2(priced.total - discount) : 0;

  const update =
    (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      // Typing in a field clears its error so the message never goes stale.
      setFieldErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
    };

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
    setFieldErrors({});

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
      ...(form.notes ? { notes: form.notes } : {}),
      paymentMethod: instapayOn ? payment : 'cod',
      ...(discountCode.trim() ? { discountCode: discountCode.trim() } : {}),
    };

    const parsed = createOrderSchema.safeParse(input);
    if (!parsed.success) {
      // Attach each issue to its form field; anything unmapped becomes the
      // generic form-level message.
      const errors: Partial<Record<keyof FormState, string>> = {};
      let generic: string | null = null;
      for (const issue of parsed.error.issues) {
        const field = PATH_TO_FIELD[issue.path.join('.')];
        if (field) errors[field] ??= issue.message;
        else generic ??= issue.message;
      }
      setFieldErrors(errors);
      setFormError(generic);
      const first = FIELD_ORDER.find((f) => errors[f]);
      if (first) document.getElementById(`checkout-${first}`)?.focus();
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
                  {item.name} × {item.qty}{' '}
                  <span className="text-muted">
                    ({item.sizeLabel === SAMPLE_SIZE_LABEL
                      ? `Sample · ${settings.data?.samples.sizeLabel ?? DEFAULT_SAMPLES_SETTINGS.sizeLabel}`
                      : item.sizeLabel})
                  </span>
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
                <span>Discount ({percent}% · {discountCode.trim().toUpperCase()})</span>
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
                {discountCode.trim().length >= 2 && codeQuery.isError && (
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
              <InputField id="checkout-name" label="Full name" autoComplete="name" value={form.name} onChange={update('name')} required error={fieldErrors.name} />
              <InputField id="checkout-phone" label="Phone" type="tel" autoComplete="tel" placeholder="01012345678" value={form.phone} onChange={update('phone')} required error={fieldErrors.phone} />
            </div>
            <InputField
              id="checkout-email"
              label="Email (optional)"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={update('email')}
              error={fieldErrors.email}
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
              error={fieldErrors.line1}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField id="checkout-city" label="City" autoComplete="address-level2" value={form.city} onChange={update('city')} required error={fieldErrors.city} />
              <div className="space-y-1">
                <label htmlFor="checkout-governorate" className="mb-1.5 block font-body text-sm text-muted">
                  Governorate
                </label>
                <select
                  id="checkout-governorate"
                  value={form.governorate}
                  onChange={update('governorate')}
                  required
                  aria-invalid={!!fieldErrors.governorate}
                  aria-describedby={fieldErrors.governorate ? 'checkout-governorate-error' : undefined}
                  className={`field-lux text-sm ${fieldErrors.governorate ? 'border-danger' : ''} ${form.governorate ? '' : 'text-muted'}`}
                >
                  <option value="" disabled>
                    Select governorate
                  </option>
                  {GOVERNORATES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
                {fieldErrors.governorate && (
                  <p id="checkout-governorate-error" className="font-body text-xs text-danger">
                    {fieldErrors.governorate}
                  </p>
                )}
              </div>
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
                aria-invalid={!!fieldErrors.notes}
                className={`field-lux text-sm ${fieldErrors.notes ? 'border-danger' : ''}`}
              />
              {fieldErrors.notes && <p className="mt-1 font-body text-xs text-danger">{fieldErrors.notes}</p>}
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

          {priced?.hasUnavailable && (
            <p className="rounded-md border border-line bg-danger-soft px-4 py-2 font-body text-sm text-danger">
              Some items in your cart are out of stock —{' '}
              <Link to="/cart" className="underline underline-offset-2">update your cart</Link> to continue.
            </p>
          )}
          {formError && <p className="font-body text-sm text-danger">{formError}</p>}

          <Button type="submit" disabled={disabled} className="w-full py-3">
            {submitting ? 'Placing order…' : 'Place order'}
          </Button>
          <p className="text-center font-body text-xs text-muted">
            Delivery in 4–5 business days · Free returns on unopened items
          </p>
          <WhatsAppAsk text="Hi HERENCIA! I have a question about my order." className="text-center" />
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
  placeholder,
  required,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
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
        placeholder={placeholder}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`field-lux text-sm ${error ? 'border-danger' : ''}`}
      />
      {error && (
        <p id={`${id}-error`} className="font-body text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
