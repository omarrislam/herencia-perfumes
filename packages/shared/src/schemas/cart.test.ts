import { describe, it, expect } from 'vitest';
import { cartItemSchema, priceCartSchema } from './cart';

describe('cart schemas', () => {
  it('accepts a valid line', () => {
    expect(cartItemSchema.safeParse({ productId: 'a'.repeat(24), sizeLabel: '50ml', qty: 2 }).success).toBe(true);
  });
  it('rejects qty < 1', () => {
    expect(cartItemSchema.safeParse({ productId: 'a'.repeat(24), sizeLabel: '50ml', qty: 0 }).success).toBe(false);
  });
  it('accepts an empty cart for pricing', () => {
    expect(priceCartSchema.safeParse({ items: [] }).success).toBe(true);
  });
});
