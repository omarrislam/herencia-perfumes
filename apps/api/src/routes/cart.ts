import { Router } from 'express';
import { priceCartSchema, setCartSchema, type CartItemInput } from '@herencia/shared';
import { Cart } from '../models/Cart';
import { HttpError } from '../middleware/error';
import { authenticate, requireAuth } from '../middleware/auth';
import { priceItems } from '../modules/cart/service';

type StoredItem = { product: unknown; sizeLabel: string; qty: number };
const toInputs = (items: StoredItem[]): CartItemInput[] =>
  items.map((i) => ({ productId: String(i.product), sizeLabel: i.sizeLabel, qty: i.qty }));
const toStored = (items: CartItemInput[]): StoredItem[] =>
  items.map((i) => ({ product: i.productId, sizeLabel: i.sizeLabel, qty: i.qty }));

export function cartRouter(): Router {
  const router = Router();

  router.post('/price', async (req, res, next) => {
    try {
      const parsed = priceCartSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      res.json(await priceItems(parsed.data.items));
    } catch (err) {
      next(err);
    }
  });

  router.use(authenticate, requireAuth);

  router.get('/', async (req, res, next) => {
    try {
      const cart = await Cart.findOne({ user: req.user!.id }).lean();
      res.json(await priceItems(cart ? toInputs(cart.items as StoredItem[]) : []));
    } catch (err) {
      next(err);
    }
  });

  router.put('/', async (req, res, next) => {
    try {
      const parsed = setCartSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      await Cart.findOneAndUpdate(
        { user: req.user!.id },
        { items: toStored(parsed.data.items) },
        { upsert: true, new: true },
      );
      res.json(await priceItems(parsed.data.items));
    } catch (err) {
      next(err);
    }
  });

  router.post('/merge', async (req, res, next) => {
    try {
      const parsed = setCartSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const existing = await Cart.findOne({ user: req.user!.id });
      const merged = new Map<string, CartItemInput>();
      const add = (i: CartItemInput) => {
        const key = `${i.productId}::${i.sizeLabel}`;
        const prev = merged.get(key);
        merged.set(key, prev ? { ...i, qty: Math.min(99, prev.qty + i.qty) } : i);
      };
      if (existing) toInputs(existing.items as StoredItem[]).forEach(add);
      parsed.data.items.forEach(add);
      const items = [...merged.values()];
      await Cart.findOneAndUpdate({ user: req.user!.id }, { items: toStored(items) }, { upsert: true });
      res.json(await priceItems(items));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
