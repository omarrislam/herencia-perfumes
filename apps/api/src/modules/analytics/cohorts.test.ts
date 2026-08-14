import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { connectMemory, disconnectMemory, clearDb } from '../../test/db';
import { Order } from '../../models/Order';
import { computeCohorts } from './cohorts';

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

const START = new Date('2026-08-01T00:00:00.000Z');
const END = new Date('2026-08-31T23:59:59.999Z');

async function order(phone: string, total: number, iso: string, over: Record<string, unknown> = {}) {
  return Order.create({
    orderNumber: `HRC-${Math.random().toString(36).slice(2, 10)}`,
    items: [{ product: new mongoose.Types.ObjectId(), name: 'X', sizeLabel: '55ml', unitPrice: total, qty: 1 }],
    customer: { name: 'C', phone },
    shippingAddress: { line1: 'a', city: 'Cairo', governorate: 'Cairo', phone },
    subtotal: total, shipping: 0, total, status: 'confirmed',
    createdAt: new Date(iso), ...over,
  });
}

describe('computeCohorts', () => {
  it('counts a first-time buyer as new', async () => {
    await order('01012345678', 500, '2026-08-05T10:00:00.000Z');
    const c = await computeCohorts(START, END);
    expect(c.newCustomers).toBe(1);
    expect(c.returningCustomers).toBe(0);
  });

  it('counts someone with an earlier order as returning', async () => {
    await order('01012345678', 500, '2026-07-01T10:00:00.000Z');
    await order('01012345678', 700, '2026-08-05T10:00:00.000Z');
    const c = await computeCohorts(START, END);
    expect(c.newCustomers).toBe(0);
    expect(c.returningCustomers).toBe(1);
  });

  it('treats two orders from one phone as a single customer', async () => {
    await order('01012345678', 500, '2026-08-05T10:00:00.000Z');
    await order('01012345678', 700, '2026-08-06T10:00:00.000Z');
    const c = await computeCohorts(START, END);
    expect(c.newCustomers + c.returningCustomers).toBe(1);
  });

  it('reports repeat rate and average lifetime value', async () => {
    await order('01012345678', 500, '2026-08-01T10:00:00.000Z');
    await order('01012345678', 500, '2026-08-09T10:00:00.000Z');
    await order('01099999999', 1000, '2026-08-10T10:00:00.000Z');
    const c = await computeCohorts(START, END);
    expect(c.repeatRate).toBeCloseTo(0.5, 5);
    expect(c.avgLtv).toBeCloseTo(1000, 5);
  });

  it('splits revenue between first-time and returning customers', async () => {
    await order('01011111111', 400, '2026-07-01T10:00:00.000Z');
    await order('01011111111', 600, '2026-08-02T10:00:00.000Z');
    await order('01022222222', 900, '2026-08-03T10:00:00.000Z');
    const c = await computeCohorts(START, END);
    expect(c.repeatOrderRevenue).toBe(600);
    expect(c.firstOrderRevenue).toBe(900);
  });

  it('ignores cancelled orders', async () => {
    await order('01012345678', 500, '2026-08-05T10:00:00.000Z', { status: 'cancelled' });
    const c = await computeCohorts(START, END);
    expect(c.newCustomers).toBe(0);
    expect(c.avgLtv).toBe(0);
  });

  it('excludes customers whose only orders fall outside the range', async () => {
    await order('01012345678', 500, '2026-07-05T10:00:00.000Z');
    const c = await computeCohorts(START, END);
    expect(c.newCustomers + c.returningCustomers).toBe(0);
  });

  it('returns zeros rather than NaN when there are no orders', async () => {
    const c = await computeCohorts(START, END);
    expect(c).toMatchObject({ newCustomers: 0, returningCustomers: 0, repeatRate: 0, avgLtv: 0 });
  });
});
