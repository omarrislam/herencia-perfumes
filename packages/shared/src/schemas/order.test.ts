import { describe, it, expect } from 'vitest';
import { createOrderSchema, egyptianPhoneSchema, ORDER_STATUS, ORDER_STATUS_TRANSITIONS, updateOrderStatusSchema, updateOrderPaidSchema, adminUpdateOrderSchema, trackOrderSchema, releaseStaleSchema } from './order';

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

  it('gives each invalid field its own friendly message', () => {
    const res = createOrderSchema.safeParse({
      ...valid,
      customer: { name: '', phone: '123' },
      shippingAddress: { ...valid.shippingAddress, city: '' },
    });
    expect(res.success).toBe(false);
    if (res.success) throw new Error('expected failure');
    const byPath = Object.fromEntries(res.error.issues.map((i) => [i.path.join('.'), i.message]));
    expect(byPath['customer.name']).toBe('Full name is required');
    expect(byPath['customer.phone']).toMatch(/Egyptian mobile/);
    expect(byPath['shippingAddress.city']).toBe('City is required');
  });
});

describe('egyptianPhoneSchema', () => {
  it('accepts local 11-digit mobiles for all carriers', () => {
    for (const p of ['01012345678', '01112345678', '01212345678', '01512345678']) {
      expect(egyptianPhoneSchema.parse(p)).toBe(p);
    }
  });
  it('normalizes +20 / 20-prefixed and spaced variants to local form', () => {
    expect(egyptianPhoneSchema.parse('+201012345678')).toBe('01012345678');
    expect(egyptianPhoneSchema.parse('201012345678')).toBe('01012345678');
    expect(egyptianPhoneSchema.parse('010 1234 5678')).toBe('01012345678');
    expect(egyptianPhoneSchema.parse('010-1234-5678')).toBe('01012345678');
  });
  it('rejects landlines, short numbers, and non-Egyptian formats', () => {
    for (const p of ['0221234567', '12345', '0100000000', '010123456789', 'not a phone']) {
      expect(egyptianPhoneSchema.safeParse(p).success).toBe(false);
    }
  });
});

describe('updateOrderPaidSchema', () => {
  it('accepts a boolean paid flag only', () => {
    expect(updateOrderPaidSchema.safeParse({ paid: true }).success).toBe(true);
    expect(updateOrderPaidSchema.safeParse({ paid: 'yes' }).success).toBe(false);
  });
});

describe('trackOrderSchema', () => {
  it('normalizes the phone so any accepted form matches the stored one', () => {
    const parsed = trackOrderSchema.parse({ orderNumber: ' HRC-ABC-1234 ', phone: '+20 100 000 0000' });
    expect(parsed).toEqual({ orderNumber: 'HRC-ABC-1234', phone: '01000000000' });
  });
  it('rejects a missing order number or a non-Egyptian phone', () => {
    expect(trackOrderSchema.safeParse({ orderNumber: '', phone: '01000000000' }).success).toBe(false);
    expect(trackOrderSchema.safeParse({ orderNumber: 'HRC-ABC-1234', phone: '99' }).success).toBe(false);
  });
});

describe('adminUpdateOrderSchema', () => {
  const valid = {
    customer: { name: 'Sara', phone: '01000000000' },
    shippingAddress: { line1: '1 Nile St', city: 'Cairo', governorate: 'Cairo', phone: '01000000000' },
  };
  it('accepts delivery details and normalizes both phones', () => {
    const parsed = adminUpdateOrderSchema.parse({
      customer: { ...valid.customer, phone: '+201000000000' },
      shippingAddress: { ...valid.shippingAddress, phone: '20 100 000 0000' },
    });
    expect(parsed.customer.phone).toBe('01000000000');
    expect(parsed.shippingAddress.phone).toBe('01000000000');
  });
  it('treats an empty email as "clear it" rather than an error', () => {
    expect(adminUpdateOrderSchema.safeParse({ ...valid, customer: { ...valid.customer, email: '' } }).success).toBe(true);
    expect(adminUpdateOrderSchema.safeParse({ ...valid, customer: { ...valid.customer, email: 'nope' } }).success).toBe(false);
  });
  it('rejects a blank name, address, city or governorate', () => {
    expect(adminUpdateOrderSchema.safeParse({ ...valid, customer: { ...valid.customer, name: ' ' } }).success).toBe(false);
    expect(adminUpdateOrderSchema.safeParse({ ...valid, shippingAddress: { ...valid.shippingAddress, city: '' } }).success).toBe(false);
  });
});

describe('releaseStaleSchema', () => {
  it('takes a whole number of hours within a month', () => {
    expect(releaseStaleSchema.safeParse({ hours: 48 }).success).toBe(true);
    expect(releaseStaleSchema.safeParse({ hours: 0 }).success).toBe(false);
    expect(releaseStaleSchema.safeParse({ hours: 1000 }).success).toBe(false);
    expect(releaseStaleSchema.safeParse({ hours: 1.5 }).success).toBe(false);
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
