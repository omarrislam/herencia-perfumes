import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { authCookie } from '../test/auth';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { Event } from '../models/Event';
import { Order } from '../models/Order';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

// Dates are relative to the REAL current day, deliberately: vitest's fake timers
// replace the global Date, mongoose casts with `instanceof Date`, and a faked Date
// fails that check — so documents seeded under fake timers store createdAt as a raw
// NUMBER and no Date range query ever matches them. Do not reintroduce setSystemTime
// in a file that writes documents with date fields.
const midnightUTC = (offset: number) => {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + offset);
  return d;
};
/** YYYY-MM-DD, `offset` days from today (negative = past). */
const key = (offset: number) => midnightUTC(offset).toISOString().slice(0, 10);
/** A timestamp at 10:00 UTC on the day `offset` days from today. */
const at = (offset: number) => new Date(midnightUTC(offset).getTime() + 10 * 3600_000);

async function admin() {
  const u = await User.create({ name: 'A', email: 'a@h.example', passwordHash: 'x', role: 'admin' });
  return authCookie(String(u._id), 'admin');
}

async function seedDay(offset: number) {
  const d = at(offset);
  const id = `s-${offset}`;
  await Session.create({
    sessionId: id, visitorId: `v-${offset}`, landingPath: '/', isBot: false,
    utm: { source: 'instagram', medium: 'social', campaign: 'launch' },
    createdAt: d, startedAt: d, lastSeenAt: d,
  });
  await Event.create({ type: 'product_view', sessionId: id, visitorId: `v-${offset}`, path: '/', createdAt: d });
  await Order.create({
    orderNumber: `HRC-${Math.random().toString(36).slice(2, 10)}`,
    items: [{ product: new mongoose.Types.ObjectId(), name: 'X', sizeLabel: '55ml', unitPrice: 500, qty: 1 }],
    customer: { name: 'C', phone: '01012345678' },
    shippingAddress: { line1: 'a', city: 'Cairo', governorate: 'Cairo', phone: '01012345678' },
    subtotal: 500, shipping: 60, total: 560, status: 'confirmed',
    attribution: { source: 'instagram', medium: 'social', campaign: 'launch' },
    createdAt: d,
  });
}

const url = (from: number, to: number) => `/api/admin/analytics?from=${key(from)}&to=${key(to)}`;

describe('GET /api/admin/analytics', () => {
  it('requires admin auth', async () => {
    await request(app).get('/api/admin/analytics').expect(401);
  });

  it('returns the funnel, series, sources and cohorts for a range', async () => {
    const cookie = await admin();
    await seedDay(-4);
    await seedDay(-3);

    const res = await request(app).get(url(-4, -3)).set('Cookie', cookie).expect(200);

    expect(res.body.funnel).toMatchObject({ sessions: 2, productViews: 2, orders: 2 });
    expect(res.body.revenue).toBe(1120);
    expect(res.body.aov).toBe(560);
    expect(res.body.series).toHaveLength(2);
    expect(res.body.series[0]).toMatchObject({ date: key(-4), orders: 1, revenue: 560 });
    const ig = res.body.sources.find((s: { source: string }) => s.source === 'instagram');
    expect(ig).toMatchObject({ sessions: 2, orders: 2, revenue: 1120 });
    expect(ig.conversion).toBe(1);
  });

  it('compares against the immediately preceding period of equal length', async () => {
    const cookie = await admin();
    await seedDay(-6); // previous window (-6..-5)
    await seedDay(-4); // current window (-4..-3)

    const res = await request(app).get(url(-4, -3)).set('Cookie', cookie).expect(200);

    expect(res.body.funnel.orders).toBe(1);
    expect(res.body.previous.orders).toBe(1);
    expect(res.body.previousRevenue).toBe(560);
  });

  it('emits a zero point for a day with no activity rather than skipping it', async () => {
    const cookie = await admin();
    await seedDay(-4);
    const res = await request(app).get(url(-4, -2)).set('Cookie', cookie).expect(200);
    expect(res.body.series).toHaveLength(3);
    expect(res.body.series[1]).toMatchObject({ date: key(-3), orders: 0, revenue: 0 });
  });

  it('returns zeros, not NaN, for a range with no data', async () => {
    const cookie = await admin();
    const res = await request(app).get(url(-9, -8)).set('Cookie', cookie).expect(200);
    expect(res.body.funnel).toMatchObject({ sessions: 0, orders: 0 });
    expect(res.body.aov).toBe(0);
    expect(res.body.cohorts.repeatRate).toBe(0);
    expect(res.body.sources).toEqual([]);
  });

  it('rejects a malformed date range', async () => {
    const cookie = await admin();
    await request(app).get(`/api/admin/analytics?from=nonsense&to=${key(0)}`).set('Cookie', cookie).expect(400);
  });

  it('rejects a reversed range', async () => {
    const cookie = await admin();
    await request(app).get(url(-1, -5)).set('Cookie', cookie).expect(400);
  });

  it('includes today, computed live rather than from a stored rollup', async () => {
    const cookie = await admin();
    await seedDay(0);
    const res = await request(app).get(url(0, 0)).set('Cookie', cookie).expect(200);
    expect(res.body.funnel.orders).toBe(1);
    expect(res.body.series[0]).toMatchObject({ date: key(0), orders: 1 });
  });

  it('attributes a pre-analytics order (no attribution) to direct', async () => {
    const cookie = await admin();
    await Order.create({
      orderNumber: 'HRC-OLD1',
      items: [{ product: new mongoose.Types.ObjectId(), name: 'X', sizeLabel: '55ml', unitPrice: 500, qty: 1 }],
      customer: { name: 'C', phone: '01012345678' },
      shippingAddress: { line1: 'a', city: 'Cairo', governorate: 'Cairo', phone: '01012345678' },
      subtotal: 500, shipping: 60, total: 560, status: 'confirmed',
      createdAt: at(-4),
    });
    const res = await request(app).get(url(-4, -3)).set('Cookie', cookie).expect(200);
    expect(res.body.sources.find((s: { source: string }) => s.source === 'direct')).toMatchObject({
      orders: 1, revenue: 560,
    });
  });

  it('defaults to the last 30 days when no range is given', async () => {
    const cookie = await admin();
    await seedDay(-2);
    const res = await request(app).get('/api/admin/analytics').set('Cookie', cookie).expect(200);
    expect(res.body.range.to).toBe(key(0));
    expect(res.body.range.from).toBe(key(-29));
    expect(res.body.funnel.orders).toBe(1);
  });
});
