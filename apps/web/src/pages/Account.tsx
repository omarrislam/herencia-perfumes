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
        className="w-full rounded border border-line bg-bg px-2 py-1.5 font-body text-sm text-content focus:outline-none focus:ring-1 focus:ring-gold"
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
    <section className="rounded-lg border border-line p-6 space-y-4">
      <h2 className="font-display text-xl text-content">Profile</h2>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-sm">
        <Field label="Name" value={name} onChange={setName} />
        <Field label="Phone" value={phone} onChange={setPhone} type="tel" />
        {error && <p className="font-body text-sm text-red-500">{error}</p>}
        {saved && <p className="font-body text-sm text-green-600">Saved!</p>}
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
      {error && <p className="font-body text-xs text-red-500">{error}</p>}
      {serverError && <p className="font-body text-xs text-red-500">{serverError}</p>}
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
    <section className="rounded-lg border border-line p-6 space-y-4">
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
          <div key={addr.id} className="rounded-md border border-gold p-3">
            <AddressForm
              initial={addr}
              onSave={(input) => editMut.mutate({ id: addr.id, input })}
              onCancel={() => { setEditingId(null); setFormError(''); }}
              serverError={formError}
            />
          </div>
        ) : (
          <div key={addr.id} className="rounded-md border border-line p-3 space-y-1">
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
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  shipped: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  delivered: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

function OrdersSection() {
  const ordersQ = useQuery({ queryKey: ['account', 'orders'], queryFn: fetchMyOrders });
  const orders = ordersQ.data?.items ?? [];

  return (
    <section className="rounded-lg border border-line p-6 space-y-4">
      <h2 className="font-display text-xl text-content">Orders</h2>
      {orders.length === 0 && (
        <p className="font-body text-sm text-muted">No orders yet.</p>
      )}
      <div className="space-y-3">
        {orders.map((order) => (
          <div
            key={order.id}
            className="flex flex-wrap items-center gap-4 rounded-md border border-line p-3"
          >
            <div className="min-w-0 flex-1">
              <p className="font-body text-sm font-semibold text-content">#{order.orderNumber}</p>
              <p className="font-body text-xs text-muted">
                {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'short', day: 'numeric',
                })}
              </p>
            </div>
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
    <section className="rounded-lg border border-line p-6 space-y-4">
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
    <div className="space-y-8 py-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-content">My Account</h1>
        <Button variant="ghost" onClick={() => { void handleSignOut(); }}>Sign out</Button>
      </div>
      <ProfileSection />
      <AddressesSection />
      <OrdersSection />
      <WishlistSection />
    </div>
  );
}
