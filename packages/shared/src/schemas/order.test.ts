import { describe, it, expect } from 'vitest';
import { createOrderSchema, ORDER_STATUS, ORDER_STATUS_TRANSITIONS, updateOrderStatusSchema } from './order';

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

describe('order status', () => {
  it('lists pending as the initial status', () => {
    expect(ORDER_STATUS[0]).toBe('pending');
  });
  it('allows pending → confirmed but not delivered → pending', () => {
    expect(ORDER_STATUS_TRANSITIONS.pending).toContain('confirmed');
    expect(ORDER_STATUS_TRANSITIONS.delivered).toEqual([]);
  });
  it('validates a status payload', () => {
    expect(updateOrderStatusSchema.safeParse({ status: 'shipped' }).success).toBe(true);
    expect(updateOrderStatusSchema.safeParse({ status: 'banana' }).success).toBe(false);
  });
});
