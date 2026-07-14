import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { Subscriber } from '../models/Subscriber';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { DiscountCode } from '../models/DiscountCode';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const ADMIN = authCookie('000000000000000000000001', 'admin');
const CUSTOMER = authCookie('000000000000000000000002', 'customer');

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

async function seedOrder(over: Record<string, unknown> = {}) {
  return Order.create({
    orderNumber: `HRC-X-${Math.random().toString(36).slice(2, 8)}`,
    items: [{ product: '000000000000000000000099', name: 'Amber Noir', sizeLabel: '50ml', unitPrice: 800, qty: 2, image: '' }],
    customer: { name: 'Mai', phone: '01000000000' },
    shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '01000000000' },
    subtotal: 1600, shipping: 50, total: 1650, status: 'pending', paymentMethod: 'cod',
    ...over,
  });
}

describe('GET /api/admin/subscribers', () => {
  it('403s for a customer and lists newest first for admin', async () => {
    await Subscriber.create({ email: 'a@x.com' });
    await Subscriber.create({ email: 'b@x.com', source: 'footer' });
    expect((await request(app).get('/api/admin/subscribers').set('Cookie', CUSTOMER)).status).toBe(403);
    const res = await request(app).get('/api/admin/subscribers').set('Cookie', ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.items[0].email).toBe('b@x.com');
  });
});

describe('GET /api/admin/customers', () => {
  it('lists customers with order aggregates (cancelled excluded)', async () => {
    const u = await User.create({ name: 'Mai', email: 'mai@x.com', passwordHash: 'x'.repeat(20), role: 'customer' });
    await seedOrder({ user: u._id });
    await seedOrder({ user: u._id, status: 'cancelled' });
    const res = await request(app).get('/api/admin/customers').set('Cookie', ADMIN);
    expect(res.status).toBe(200);
    const row = res.body.items.find((c: { email: string }) => c.email === 'mai@x.com');
    expect(row.orderCount).toBe(1);
    expect(row.totalSpent).toBe(1650);
  });
});

describe('GET /api/admin/stats', () => {
  it('aggregates revenue, pending, and best sellers excluding cancelled', async () => {
    await seedOrder();
    await seedOrder({ status: 'delivered' });
    await seedOrder({ status: 'cancelled' });
    const res = await request(app).get('/api/admin/stats').set('Cookie', ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.orders).toBe(2);
    expect(res.body.revenue).toBe(3300);
    expect(res.body.pending).toBe(1);
    expect(res.body.bestSellers[0]).toMatchObject({ name: 'Amber Noir', qty: 4, revenue: 3200 });
  });
});

describe('discount codes', () => {
  it('admin CRUD + public preview endpoint', async () => {
    const created = await request(app).post('/api/admin/discounts').set('Cookie', ADMIN)
      .send({ code: 'eid25', percent: 25, isActive: true });
    expect(created.status).toBe(201);
    expect(created.body.code).toBe('EID25'); // uppercased

    const dup = await request(app).post('/api/admin/discounts').set('Cookie', ADMIN)
      .send({ code: 'EID25', percent: 10, isActive: true });
    expect(dup.status).toBe(409);

    const pub = await request(app).get('/api/discounts/eid25');
    expect(pub.status).toBe(200);
    expect(pub.body).toEqual({ code: 'EID25', percent: 25 });

    const paused = await request(app).put(`/api/admin/discounts/${created.body.id}`).set('Cookie', ADMIN)
      .send({ code: 'EID25', percent: 25, isActive: false });
    expect(paused.body.isActive).toBe(false);
    expect((await request(app).get('/api/discounts/eid25')).status).toBe(404);

    expect((await request(app).delete(`/api/admin/discounts/${created.body.id}`).set('Cookie', ADMIN)).status).toBe(204);
  });

  it('expired codes 404 on the public endpoint', async () => {
    await DiscountCode.create({ code: 'OLD', percent: 10, isActive: true, expiresAt: new Date(Date.now() - 1000) });
    expect((await request(app).get('/api/discounts/OLD')).status).toBe(404);
  });
});

describe('GET /api/admin/orders-export', () => {
  it('returns CSV honoring the status filter', async () => {
    await seedOrder();
    await seedOrder({ status: 'shipped' });
    const res = await request(app).get('/api/admin/orders-export?status=shipped').set('Cookie', ADMIN);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    const lines = res.text.trim().split('\n');
    expect(lines).toHaveLength(2); // header + 1 shipped order
    expect(lines[0]).toContain('orderNumber');
    expect(lines[1]).toContain('"shipped"');
    expect(lines[1]).toContain('Amber Noir x2 (50ml)');
  });
});
