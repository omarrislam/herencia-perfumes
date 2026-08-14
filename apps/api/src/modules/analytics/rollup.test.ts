import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import { connectMemory, disconnectMemory, clearDb } from '../../test/db';
import { Event } from '../../models/Event';
import { Session } from '../../models/Session';
import { Order } from '../../models/Order';
import { DailyStat } from '../../models/DailyStat';
import { rollupDay, ensureRollups, dayKey, bucketSource } from './rollup';

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);
afterEach(() => vi.useRealTimers());

const DAY = '2026-08-10';
const at = (h: number) => new Date(`${DAY}T${String(h).padStart(2, '0')}:00:00.000Z`);

async function session(id: string, over: Record<string, unknown> = {}) {
  return Session.create({
    sessionId: id,
    visitorId: `v-${id}`,
    landingPath: '/',
    isBot: false,
    createdAt: at(9),
    startedAt: at(9),
    lastSeenAt: at(9),
    ...over,
  });
}
async function ev(type: string, sessionId: string, over: Record<string, unknown> = {}) {
  return Event.create({
    type,
    sessionId,
    visitorId: `v-${sessionId}`,
    path: '/',
    createdAt: at(10),
    ...over,
  });
}
async function order(total: number, over: Record<string, unknown> = {}) {
  return Order.create({
    orderNumber: `HRC-${Math.random().toString(36).slice(2, 10)}`,
    items: [{ product: new mongoose.Types.ObjectId(), name: 'X', sizeLabel: '55ml', unitPrice: total, qty: 1 }],
    customer: { name: 'Mai', phone: '01012345678' },
    shippingAddress: { line1: 'a', city: 'Cairo', governorate: 'Cairo', phone: '01012345678' },
    subtotal: total,
    shipping: 0,
    total,
    status: 'confirmed',
    createdAt: at(11),
    ...over,
  });
}

describe('dayKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(dayKey(new Date('2026-08-10T23:30:00.000Z'))).toBe('2026-08-10');
  });
});

describe('bucketSource', () => {
  it('prefers an explicit utm source', () => {
    expect(bucketSource({ utm: { source: 'instagram' }, referrer: 'https://google.com/' })).toBe('instagram');
  });
  it('falls back to the referrer host so organic traffic is not hidden', () => {
    expect(bucketSource({ referrer: 'https://www.google.com/search?q=perfume' })).toBe('google.com');
  });
  it('calls a visit with neither one direct', () => {
    expect(bucketSource({})).toBe('direct');
  });
  it('does not throw on an unparseable referrer', () => {
    expect(bucketSource({ referrer: 'not a url' })).toBe('direct');
  });
});

describe('rollupDay', () => {
  it('counts sessions, funnel steps and revenue for the day', async () => {
    await session('a');
    await session('b');
    await ev('page_view', 'a');
    await ev('product_view', 'a');
    await ev('add_to_cart', 'a');
    await ev('checkout_started', 'a');
    await order(560);
    await order(440);

    await rollupDay(DAY);

    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d).toMatchObject({
      sessions: 2,
      productViews: 1,
      addToCarts: 1,
      checkoutStarts: 1,
      orders: 2,
      revenue: 1000,
    });
  });

  it('takes orders and revenue from Order, not from purchase events', async () => {
    // Ad blockers can drop events; they cannot drop an order.
    await session('a');
    await order(560);
    await rollupDay(DAY);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d!.orders).toBe(1);
    expect(d!.revenue).toBe(560);
  });

  it('excludes cancelled orders from revenue', async () => {
    await order(560);
    await order(999, { status: 'cancelled' });
    await rollupDay(DAY);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d!.orders).toBe(1);
    expect(d!.revenue).toBe(560);
  });

  it('excludes bot sessions and their events', async () => {
    await session('human');
    await session('crawler', { isBot: true });
    await ev('product_view', 'human');
    await ev('product_view', 'crawler');
    await rollupDay(DAY);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d!.sessions).toBe(1);
    expect(d!.productViews).toBe(1);
  });

  it('is idempotent — recomputing overwrites rather than accumulating', async () => {
    await session('a');
    await order(560);
    await rollupDay(DAY);
    await rollupDay(DAY);
    expect(await DailyStat.countDocuments({ date: DAY })).toBe(1);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d!.sessions).toBe(1);
    expect(d!.revenue).toBe(560);
  });

  it('groups sessions by campaign', async () => {
    await session('a', { utm: { source: 'instagram', medium: 'social', campaign: 'launch' } });
    await session('b', { utm: { source: 'instagram', medium: 'social', campaign: 'launch' } });
    await session('c');
    await rollupDay(DAY);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    const ig = d!.bySource.find((s) => s.source === 'instagram');
    expect(ig).toMatchObject({ medium: 'social', campaign: 'launch', sessions: 2 });
    expect(d!.bySource.find((s) => s.source === 'direct')?.sessions).toBe(1);
  });

  it('counts unique visitors separately from sessions', async () => {
    await session('a', { visitorId: 'same' });
    await session('b', { visitorId: 'same' });
    await rollupDay(DAY);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d!.sessions).toBe(2);
    expect(d!.visitors).toBe(1);
  });

  it('ignores activity from other days', async () => {
    await session('a');
    await Session.create({
      sessionId: 'other', visitorId: 'vo', landingPath: '/', isBot: false,
      createdAt: new Date('2026-08-11T10:00:00.000Z'),
    });
    await rollupDay(DAY);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d!.sessions).toBe(1);
  });

  it('writes a zero row for a day with no activity', async () => {
    await rollupDay(DAY);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d).toMatchObject({ sessions: 0, orders: 0, revenue: 0 });
  });
});

describe('ensureRollups', () => {
  it('fills every missing past day in the range', async () => {
    vi.setSystemTime(new Date('2026-08-13T12:00:00.000Z'));
    await ensureRollups('2026-08-10', '2026-08-12');
    const rows = await DailyStat.find({}).sort({ date: 1 }).lean();
    expect(rows.map((r) => r.date)).toEqual(['2026-08-10', '2026-08-11', '2026-08-12']);
  });

  it('never stores today — today is always computed live', async () => {
    vi.setSystemTime(new Date('2026-08-12T12:00:00.000Z'));
    await ensureRollups('2026-08-10', '2026-08-12');
    const rows = await DailyStat.find({}).lean();
    expect(rows.map((r) => r.date)).not.toContain('2026-08-12');
  });

  it('leaves an already-stored day alone', async () => {
    vi.setSystemTime(new Date('2026-08-13T12:00:00.000Z'));
    await ensureRollups('2026-08-10', '2026-08-12');
    await DailyStat.updateOne({ date: '2026-08-10' }, { $set: { sessions: 999 } });
    await ensureRollups('2026-08-10', '2026-08-12');
    const d = await DailyStat.findOne({ date: '2026-08-10' }).lean();
    expect(d!.sessions).toBe(999);
  });

  it('does nothing when the whole range is today or later', async () => {
    vi.setSystemTime(new Date('2026-08-10T12:00:00.000Z'));
    await ensureRollups('2026-08-10', '2026-08-10');
    expect(await DailyStat.countDocuments()).toBe(0);
  });
});
