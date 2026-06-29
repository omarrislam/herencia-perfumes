import { describe, it, expect } from 'vitest';
import { createOrderSchema } from './order';

describe('createOrderSchema', () => {
  const valid = {
    items: [{ productId: '64f000000000000000000000', sizeLabel: '50ml', qty: 2 }],
    customer: { name: 'Sara', phone: '01000000000' },
    shippingAddress: { line1: '1 Nile St', city: 'Cairo', governorate: 'Cairo', phone: '01000000000' },
  };

  it('accepts a valid order', () => {
    expect(createOrderSchema.parse(valid)).toMatchObject({ items: [{ qty: 2 }] });
  });

  it('rejects qty below 1', () => {
    const bad = { ...valid, items: [{ ...valid.items[0], qty: 0 }] };
    expect(() => createOrderSchema.parse(bad)).toThrow();
  });

  it('rejects empty items', () => {
    expect(() => createOrderSchema.parse({ ...valid, items: [] })).toThrow();
  });
});
