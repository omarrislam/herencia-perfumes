import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'invalid id');

export const cartItemSchema = z.object({
  productId: objectId,
  sizeLabel: z.string().min(1).max(20),
  qty: z.number().int().min(1).max(99),
});
export type CartItemInput = z.infer<typeof cartItemSchema>;

export const priceCartSchema = z.object({ items: z.array(cartItemSchema).max(100) });
export type PriceCartInput = z.infer<typeof priceCartSchema>;

// Server-set cart (logged-in PUT / merge) — same shape.
export const setCartSchema = priceCartSchema;
export type SetCartInput = PriceCartInput;

export type PricedCartLineDTO = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  sizeLabel: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  available: boolean;
  maxQty: number;
};
export type PricedCartDTO = {
  items: PricedCartLineDTO[];
  subtotal: number;
  shipping: number;
  total: number;
  hasUnavailable: boolean;
};
