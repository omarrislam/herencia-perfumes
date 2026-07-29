import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';
import { Setting } from '../models/Setting';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const USER_ID = '000000000000000000000020';
const USER = authCookie(USER_ID, 'customer');

beforeAll(connectMemory);
afterAll(disconnectMemory);

let productId: string;
beforeEach(async () => {
  await clearDb();
  await Setting.create({
    whatsappNumber: '201000000000', shippingFee: 50, freeShippingThreshold: 2000,
    hero: { title: 't', subtitle: 's', ctaText: 'c', ctaLink: '/', image: 'x' },
  });
  const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const p = await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['img1'],
    sizes: [{ label: '50ml', price: 800, stock: 3 }], scentFamily: fam._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  productId = String(p._id);
});

const body = (qty: number) => ({
  items: [{ productId, sizeLabel: '50ml', qty }],
  customer: { name: 'Mai', phone: '01000000000' },
  shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '01000000000' },
});

describe('POST /api/orders', () => {
  it('creates a guest order and returns order + whatsappUrl', async () => {
    const res = await request(app).post('/api/orders').send(body(1));
    expect(res.status).toBe(201);
    expect(res.body.order.orderNumber).toMatch(/^HRC-/);
    expect(res.body.whatsappUrl).toContain('wa.me');
  });
  it('rejects an over-stock order with 409', async () => {
    const res = await request(app).post('/api/orders').send(body(9));
    expect(res.status).toBe(409);
  });
  it('rejects an invalid body with 400', async () => {
    const res = await request(app).post('/api/orders').send({ items: [] });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/orders/track', () => {
  const place = async () => (await request(app).post('/api/orders').send(body(1))).body.order;

  it('returns the order for the right order number + phone', async () => {
    const placed = await place();
    const res = await request(app)
      .post('/api/orders/track')
      .send({ orderNumber: placed.orderNumber, phone: '01000000000' });
    expect(res.status).toBe(200);
    expect(res.body.orderNumber).toBe(placed.orderNumber);
    expect(res.body.items[0].name).toBe('Royal Oud');
  });

  it('accepts the +20 form of the same number and a lowercase order number', async () => {
    const placed = await place();
    const res = await request(app)
      .post('/api/orders/track')
      .send({ orderNumber: placed.orderNumber.toLowerCase(), phone: '+20 100 000 0000' });
    expect(res.status).toBe(200);
  });

  it('404s when the phone does not match — an order number alone reveals nothing', async () => {
    const placed = await place();
    const res = await request(app)
      .post('/api/orders/track')
      .send({ orderNumber: placed.orderNumber, phone: '01111111111' });
    expect(res.status).toBe(404);
    expect(res.body.error.message).not.toContain('phone number is wrong');
  });

  it('404s for an unknown order number', async () => {
    const res = await request(app)
      .post('/api/orders/track')
      .send({ orderNumber: 'HRC-NOPE-0000', phone: '01000000000' });
    expect(res.status).toBe(404);
  });

  it('400s on a malformed phone number', async () => {
    const res = await request(app)
      .post('/api/orders/track')
      .send({ orderNumber: 'HRC-XXXX-0000', phone: '12345' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/orders/me', () => {
  it('401s for a guest', async () => {
    expect((await request(app).get('/api/orders/me')).status).toBe(401);
  });
  it('lists the logged-in user’s orders newest first', async () => {
    await request(app).post('/api/orders').set('Cookie', USER).send(body(1));
    const res = await request(app).get('/api/orders/me').set('Cookie', USER);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].customer.name).toBe('Mai');
  });
});
