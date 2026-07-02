import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrderSchema, type CreateOrderInput, type CreateOrderResultDTO } from '@herencia/shared';
import { useCart } from '../features/cart/CartContext';
import { useAuth } from '../features/auth/AuthContext';
import { Price } from '../components/Price';
import { Button } from '../components/Button';
import * as api from '../lib/api';

type FormState = {
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  city: string;
  governorate: string;
  notes: string;
};

export default function Checkout() {
  const { items, priced, clear } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(() => ({
    name: user?.name ?? '',
    phone: user?.phone ?? '',
    email: user?.email ?? '',
    line1: '',
    line2: '',
    city: '',
    governorate: '',
    notes: '',
  }));
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
        ...(form.line2 ? { line2: form.line2 } : {}),
        city: form.city,
        governorate: form.governorate,
        phone: form.phone,
      },
      ...(form.notes ? { notes: form.notes } : {}),
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
      navigate('/order-confirmation', { state: result, replace: true });
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <p className="eyebrow">Almost there</p>
        <h1 className="display mt-2 text-3xl text-content">Checkout</h1>
        <div className="rule-gold-left mt-4" />
      </div>

      {priced && (
        <section className="card-lux space-y-3 rounded-xl p-5">
          <p className="eyebrow">Order summary</p>
          <ul className="space-y-2">
            {priced.items.map((item) => (
              <li
                key={`${item.productId}-${item.sizeLabel}`}
                className="flex items-center justify-between font-body text-sm text-content"
              >
                <span>
                  {item.name} &times; {item.qty} ({item.sizeLabel})
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
              <Price value={priced.shipping} />
            </div>
            <div className="flex justify-between pt-1 text-base font-medium text-content">
              <span>Total</span>
              <Price value={priced.total} />
            </div>
          </div>
        </section>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <section className="space-y-4">
          <h2 className="font-display text-lg text-content">Customer Information</h2>
          <InputField id="checkout-name" label="Full name" value={form.name} onChange={update('name')} required />
          <InputField id="checkout-phone" label="Phone" value={form.phone} onChange={update('phone')} required />
          <InputField
            id="checkout-email"
            label="Email (optional)"
            type="email"
            value={form.email}
            onChange={update('email')}
          />
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-lg text-content">Shipping Address</h2>
          <InputField
            id="checkout-line1"
            label="Address line 1"
            value={form.line1}
            onChange={update('line1')}
            required
          />
          <InputField
            id="checkout-line2"
            label="Address line 2 (optional)"
            value={form.line2}
            onChange={update('line2')}
          />
          <InputField id="checkout-city" label="City" value={form.city} onChange={update('city')} required />
          <InputField
            id="checkout-governorate"
            label="Governorate"
            value={form.governorate}
            onChange={update('governorate')}
            required
          />
        </section>

        <section className="space-y-4">
          <h2 className="font-display text-lg text-content">Additional</h2>
          <div className="space-y-1">
            <label htmlFor="checkout-notes" className="mb-1.5 block font-body text-sm text-muted">
              Notes (optional)
            </label>
            <textarea
              id="checkout-notes"
              value={form.notes}
              onChange={update('notes')}
              rows={3}
              className="field-lux text-sm"
            />
          </div>
        </section>

        {formError && <p className="font-body text-sm text-danger">{formError}</p>}

        <Button type="submit" disabled={disabled} className="w-full py-3">
          Place Order
        </Button>
      </form>
    </div>
  );
}

function InputField({
  id,
  label,
  value,
  onChange,
  type = 'text',
  required,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
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
        required={required}
        className="field-lux text-sm"
      />
    </div>
  );
}
