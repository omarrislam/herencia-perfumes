import { useState, useEffect, useId, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { addressSchema } from '@herencia/shared';
import type { AddressDTO, AddressInput, UpdateProfileInput } from '@herencia/shared';
import { useAuth } from '../features/auth/AuthContext';
import { Button } from '../components/Button';
import { Price } from '../components/Price';
import { ProductCard } from '../components/ProductCard';
import { ApiError } from '../lib/api';
import {
  fetchProfile,
  updateProfile,
  fetchAddresses,
  addAddress,
  updateAddress,
  deleteAddress,
  fetchWishlist,
  fetchMyOrders,
} from '../lib/api';

// ---- Shared input field ----

function Field({
  label, value, onChange, type = 'text', className = '',
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className="font-body text-xs text-muted block mb-0.5">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="field-lux text-sm"
      />
    </div>
  );
}

// ---- Profile section ----

function ProfileSection() {
  const qc = useQueryClient();
  const profileQ = useQuery({ queryKey: ['account', 'profile'], queryFn: fetchProfile });
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profileQ.data) {
      setName(profileQ.data.name);
      setPhone(profileQ.data.phone ?? '');
    }
  }, [profileQ.data]);

  const mut = useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setError('');
      void qc.invalidateQueries({ queryKey: ['account', 'profile'] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : 'Update failed');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    const input: UpdateProfileInput = {};
    if (name) input.name = name;
    if (phone) input.phone = phone;
    mut.mutate(input);
  };

  return (
    <section className="card-lux space-y-4 rounded-2xl p-6 md:p-8">
      <h2 className="font-display text-xl text-content">Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Phone" value={phone} onChange={setPhone} type="tel" />
        {error && <p className="font-body text-sm text-danger">{error}</p>}
        {saved && <p className="font-body text-sm text-success">Saved!</p>}
        <Button type="submit" disabled={mut.isPending}>
          {mut.isPending ? 'Saving…' : 'Save changes'}
        </Button>
      </form>
    </section>
  );
}

// ---- Address form ----

function AddressForm({
  initial, onSave, onCancel, serverError = '',
}: {
  initial?: AddressInput;
  onSave: (input: AddressInput) => void;
  onCancel: () => void;
  serverError?: string;
}) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [line1, setLine1] = useState(initial?.line1 ?? '');
  const [line2, setLine2] = useState(initial?.line2 ?? '');
  const [city, setCity] = useState(initial?.city ?? '');
  const [governorate, setGov] = useState(initial?.governorate ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [isDefault, setIsDefault] = useState(initial?.isDefault ?? false);
  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const data: AddressInput = {
      label, line1, line2: line2 || undefined, city, governorate, phone, isDefault,
    };
    const result = addressSchema.safeParse(data);
    if (!result.success) {
      setError(result.error.errors[0]?.message ?? 'Invalid input');
      return;
    }
    setError('');
    onSave(result.data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 mt-3">
      <div className="grid grid-cols-2 gap-2">
        <Field label="Label (e.g. Home)" value={label} onChange={setLabel} />
        <Field label="Phone" value={phone} onChange={setPhone} type="tel" />
        <Field label="Street address" value={line1} onChange={setLine1} className="col-span-2" />
        <Field label="Apt / floor (optional)" value={line2} onChange={setLine2} className="col-span-2" />
        <Field label="City" value={city} onChange={setCity} />
        <Field label="Governorate" value={governorate} onChange={setGov} />
      </div>
      <label className="flex items-center gap-2 font-body text-sm text-content cursor-pointer">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
        />
        Set as default
      </label>
      {error && <p className="font-body text-xs text-danger">{error}</p>}
      {serverError && <p className="font-body text-xs text-danger">{serverError}</p>}
      <div className="flex gap-2">
        <Button type="submit">Save address</Button>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
}

// ---- Addresses section ----

function AddressesSection() {
  const qc = useQueryClient();
  const addressesQ = useQuery({ queryKey: ['account', 'addresses'], queryFn: fetchAddresses });
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['account', 'addresses'] });
  };

  const addMut = useMutation({
    mutationFn: addAddress,
    onSuccess: () => { setAdding(false); setFormError(''); invalidate(); },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Failed to save address'),
  });
  const editMut = useMutation({
    mutationFn: ({ id, input }: { id: string; input: AddressInput }) => updateAddress(id, input),
    onSuccess: () => { setEditingId(null); setFormError(''); invalidate(); },
    onError: (err) => setFormError(err instanceof ApiError ? err.message : 'Failed to save address'),
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteAddress(id),
    onSuccess: () => invalidate(),
  });

  const addresses: AddressDTO[] = addressesQ.data ?? [];

  return (
    <section className="card-lux space-y-4 rounded-2xl p-6 md:p-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl text-content">Addresses</h2>
        {!adding && (
          <Button variant="secondary" onClick={() => setAdding(true)}>Add address</Button>
        )}
      </div>

      {addresses.length === 0 && !adding && (
        <p className="font-body text-sm text-muted">No saved addresses.</p>
      )}

      {addresses.map((addr) =>
        editingId === addr.id ? (
          <div key={addr.id} className="rounded-xl border border-accent p-4">
            <AddressForm
              initial={addr}
              onSave={(input) => editMut.mutate({ id: addr.id, input })}
              onCancel={() => { setEditingId(null); setFormError(''); }}
              serverError={formError}
            />
          </div>
        ) : (
          <div key={addr.id} className="rounded-xl border border-hairline p-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-body font-semibold text-content">{addr.label}</span>
              {addr.isDefault && (
                <span className="rounded bg-maroon px-2 py-0.5 font-body text-xs text-cream">Default</span>
              )}
            </div>
            <p className="font-body text-sm text-muted">
              {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}
            </p>
            <p className="font-body text-sm text-muted">{addr.city}, {addr.governorate}</p>
            <p className="font-body text-sm text-muted">{addr.phone}</p>
            <div className="flex gap-2 mt-2">
              <Button variant="ghost" onClick={() => setEditingId(addr.id)}>Edit</Button>
              <Button
                variant="ghost"
                disabled={deleteMut.isPending}
                onClick={() => deleteMut.mutate(addr.id)}
              >
                Delete
              </Button>
            </div>
          </div>
        ),
      )}

      {adding && (
        <div className="rounded-md border border-gold p-3">
          <AddressForm
            onSave={(input) => addMut.mutate(input)}
            onCancel={() => { setAdding(false); setFormError(''); }}
            serverError={formError}
          />
        </div>
      )}
    </section>
  );
}

// ---- Orders section ----

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-warning-soft text-warning',
  confirmed: 'bg-info-soft text-info',
  shipped: 'bg-accent/15 text-accent',
  delivered: 'bg-success-soft text-success',
  cancelled: 'bg-danger-soft text-danger',
};

const ORDER_STATUS_LS = 'herencia.orderStatuses';

function OrdersSection() {
  const ordersQ = useQuery({ queryKey: ['account', 'orders'], queryFn: fetchMyOrders });
  const orders = ordersQ.data?.items ?? [];
  const [changed, setChanged] = useState<Set<string>>(new Set());

  // Flag orders whose status changed since the last visit (client-side notification).
  useEffect(() => {
    const list = ordersQ.data?.items ?? [];
    if (list.length === 0) return;
    let prev: Record<string, string> = {};
    try {
      prev = JSON.parse(localStorage.getItem(ORDER_STATUS_LS) || '{}') as Record<string, string>;
    } catch {
      prev = {};
    }
    const nowChanged = new Set<string>();
    const current: Record<string, string> = {};
    for (const o of list) {
      current[o.id] = o.status;
      if (prev[o.id] && prev[o.id] !== o.status) nowChanged.add(o.id);
    }
    setChanged(nowChanged);
    localStorage.setItem(ORDER_STATUS_LS, JSON.stringify(current));
  }, [ordersQ.data]);

  return (
    <section className="card-lux space-y-4 rounded-2xl p-6 md:p-8">
      <h2 className="font-display text-xl text-content">Orders</h2>
      {orders.length === 0 && (
        <p className="font-body text-sm text-muted">No orders yet.</p>
      )}
      <div className="space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="flex flex-wrap items-center gap-4 rounded-xl border border-hairline p-4"
          >
            <div className="min-w-0 flex-1">
              <p className="font-body text-sm font-semibold text-content">#{order.orderNumber}</p>
              <p className="font-body text-xs text-muted">
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </p>
            </div>
            {changed.has(order.id) && (
              <span className="rounded-full bg-accent px-2 py-0.5 font-body text-[10px] font-medium uppercase tracking-wide text-surface" title="Status updated since your last visit">
                Updated
              </span>
            )}
            <span
              className={`rounded px-2 py-0.5 font-body text-xs capitalize ${STATUS_COLORS[order.status] ?? 'bg-surface text-muted'}`}
            >
              {order.status}
            </span>
            <Price value={order.total} />
          </div>
        ))}
      </div>
    </section>
  );
}

// ---- Wishlist section ----

function WishlistSection() {
  const wishlistQ = useQuery({ queryKey: ['account', 'wishlist'], queryFn: fetchWishlist });
  const products = wishlistQ.data ?? [];

  return (
    <section className="card-lux space-y-4 rounded-2xl p-6 md:p-8">
      <h2 className="font-display text-xl text-content">Wishlist</h2>
      {products.length === 0 && (
        <p className="font-body text-sm text-muted">No saved items.</p>
      )}
      {products.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}

// ---- Main Account page ----

export default function Account() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Your maison</p>
          <h1 className="display mt-2 text-3xl text-content">My Account</h1>
        </div>
        <Button variant="ghost" onClick={() => { void handleSignOut(); }}>Sign out</Button>
      </div>
      <ProfileSection />
      <AddressesSection />
      <OrdersSection />
      <WishlistSection />
    </div>
  );
}
