import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { CartItemInput, PricedCartDTO } from '@herencia/shared';
import * as api from '../../lib/api';
import { useAuth } from '../auth/AuthContext';

const LS_KEY = 'herencia.cart';
const loadGuest = (): CartItemInput[] => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as CartItemInput[];
  } catch {
    return [];
  }
};

type CartValue = {
  items: CartItemInput[];
  priced: PricedCartDTO | null;
  count: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  addItem: (item: CartItemInput) => void;
  updateQty: (productId: string, sizeLabel: string, qty: number) => void;
  removeItem: (productId: string, sizeLabel: string) => void;
  clear: () => void;
};

const CartCtx = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<CartItemInput[]>(() => loadGuest());
  const [priced, setPriced] = useState<PricedCartDTO | null>(null);
  const [open, setOpen] = useState(false);
  const mergedRef = useRef(false);

  // Persist + re-price whenever items change (guest → localStorage + price endpoint;
  // logged-in → server PUT which returns the priced cart).
  useEffect(() => {
    if (loading) return;
    if (user && !mergedRef.current) return;
    let cancelled = false;
    (async () => {
      if (user) {
        const p = await api.setServerCart(items);
        if (!cancelled) setPriced(p);
      } else {
        localStorage.setItem(LS_KEY, JSON.stringify(items));
        const p = await api.priceCart(items);
        if (!cancelled) setPriced(p);
      }
    })().catch(() => undefined);
    return () => { cancelled = true; };
  }, [items, user, loading]);

  // Reset merge flag on logout so next login re-runs the merge.
  useEffect(() => {
    if (!user) mergedRef.current = false;
  }, [user]);

  // On login, merge the guest cart server-side once, then adopt the server cart.
  useEffect(() => {
    if (loading || !user || mergedRef.current) return;
    mergedRef.current = true;
    (async () => {
      const guest = loadGuest();
      const merged = guest.length ? await api.mergeServerCart(guest) : await api.getServerCart();
      localStorage.removeItem(LS_KEY);
      setItems(merged.items.map((l) => ({ productId: l.productId, sizeLabel: l.sizeLabel, qty: l.qty })));
      setPriced(merged);
    })().catch(() => undefined);
  }, [user, loading]);

  const addItem: CartValue['addItem'] = (item) =>
    setItems((prev) => {
      const i = prev.findIndex((x) => x.productId === item.productId && x.sizeLabel === item.sizeLabel);
      if (i === -1) return [...prev, item];
      const next = [...prev];
      next[i] = { ...next[i]!, qty: Math.min(99, next[i]!.qty + item.qty) };
      return next;
    });
  const updateQty: CartValue['updateQty'] = (productId, sizeLabel, qty) =>
    setItems((prev) => prev.map((x) => (x.productId === productId && x.sizeLabel === sizeLabel ? { ...x, qty } : x)).filter((x) => x.qty > 0));
  const removeItem: CartValue['removeItem'] = (productId, sizeLabel) =>
    setItems((prev) => prev.filter((x) => !(x.productId === productId && x.sizeLabel === sizeLabel)));
  const clear = () => setItems([]);

  const count = items.reduce((n, i) => n + i.qty, 0);
  return (
    <CartCtx.Provider value={{ items, priced, count, open, setOpen, addItem, updateQty, removeItem, clear }}>
      {children}
    </CartCtx.Provider>
  );
}

export function useCart(): CartValue {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
