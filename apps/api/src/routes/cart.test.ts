import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';
import { Setting } from '../models/Setting';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const USER = authCookie('000000000000000000000010', 'customer');

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
    sizes: [{ label: '50ml', price: 800, stock: 5 }], scentFamily: fam._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  productId = String(p._id);
});

describe('POST /api/cart/price (public)', () => {
  it('prices an anonymous cart', async () => {
    const res = await request(app).post('/api/cart/price').send({ items: [{ productId, sizeLabel: '50ml', qty: 2 }] });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1650);
  });
  it('rejects an invalid body with 400', async () => {
    const res = await request(app).post('/api/cart/price').send({ items: [{ productId: 'x', sizeLabel: '', qty: 0 }] });
    expect(res.status).toBe(400);
  });
});

describe('GET/PUT /api/cart (auth)', () => {
  it('401s without a cookie', async () => {
    expect((await request(app).get('/api/cart')).status).toBe(401);
  });
  it('persists and returns a priced cart', async () => {
    const put = await request(app).put('/api/cart').set('Cookie', USER).send({ items: [{ productId, sizeLabel: '50ml', qty: 1 }] });
    expect(put.status).toBe(200);
    expect(put.body.total).toBe(850);
    const get = await request(app).get('/api/cart').set('Cookie', USER);
    expect(get.body.items).toHaveLength(1);
  });
});

describe('POST /api/cart/merge (auth)', () => {
  it('unions guest items into the stored cart, summing duplicate qty', async () => {
    await request(app).put('/api/cart').set('Cookie', USER).send({ items: [{ productId, sizeLabel: '50ml', qty: 1 }] });
    const res = await request(app).post('/api/cart/merge').set('Cookie', USER).send({ items: [{ productId, sizeLabel: '50ml', qty: 2 }] });
    expect(res.status).toBe(200);
    expect(res.body.items[0].qty).toBe(3);
  });
});
