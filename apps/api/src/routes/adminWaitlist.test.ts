import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { authCookie } from '../test/auth';
import { User } from '../models/User';
import { Product } from '../models/Product';
import { ScentFamily } from '../models/ScentFamily';
import { StockNotification } from '../models/StockNotification';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

async function admin() {
  const u = await User.create({ name: 'A', email: 'a@h.example', passwordHash: 'x', role: 'admin' });
  return authCookie(String(u._id), 'admin');
}

async function makeProduct(stock: number) {
  const fam = await ScentFamily.create({ name: 'Floral', slug: 'floral', order: 1 });
  return Product.create({
    name: 'Perla Rosa', slug: 'perla-rosa', type: 'perfume', shortDesc: 'x', description: 'x',
    images: ['img'], sizes: [{ label: '55ml', price: 500, stock }],
    scentFamily: fam._id, gender: 'women', concentration: 'Extrait', isActive: true,
  });
}

describe('GET /api/admin/waitlist', () => {
  it('requires admin auth', async () => {
    await request(app).get('/api/admin/waitlist').expect(401);
  });

  it('groups people waiting by product and size', async () => {
    const cookie = await admin();
    const p = await makeProduct(0);
    await StockNotification.create({ product: p._id, sizeLabel: '55ml', phone: '01012345678' });
    await StockNotification.create({ product: p._id, sizeLabel: '55ml', phone: '01099999999' });

    const res = await request(app).get('/api/admin/waitlist').set('Cookie', cookie).expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ name: 'Perla Rosa', sizeLabel: '55ml', waiting: 2, inStock: 0 });
  });

  it('reports current stock so the owner knows who to contact', async () => {
    const cookie = await admin();
    const p = await makeProduct(7); // restocked since people signed up
    await StockNotification.create({ product: p._id, sizeLabel: '55ml', phone: '01012345678' });
    const res = await request(app).get('/api/admin/waitlist').set('Cookie', cookie).expect(200);
    expect(res.body[0]).toMatchObject({ waiting: 1, inStock: 7 });
  });

  it('excludes people already marked notified', async () => {
    const cookie = await admin();
    const p = await makeProduct(0);
    await StockNotification.create({ product: p._id, sizeLabel: '55ml', phone: '01012345678', notified: true });
    const res = await request(app).get('/api/admin/waitlist').set('Cookie', cookie).expect(200);
    expect(res.body).toEqual([]);
  });

  it('returns an empty list when nobody is waiting', async () => {
    const cookie = await admin();
    await makeProduct(0);
    const res = await request(app).get('/api/admin/waitlist').set('Cookie', cookie).expect(200);
    expect(res.body).toEqual([]);
  });
});

describe('GET /api/admin/waitlist/:productId/:sizeLabel', () => {
  it('lists the individual people so they can be contacted', async () => {
    const cookie = await admin();
    const p = await makeProduct(0);
    await StockNotification.create({ product: p._id, sizeLabel: '55ml', phone: '01012345678', email: 'a@b.c' });

    const res = await request(app)
      .get(`/api/admin/waitlist/${String(p._id)}/55ml`)
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ phone: '01012345678', email: 'a@b.c', notified: false });
  });
});

describe('PUT /api/admin/waitlist/:id/notified', () => {
  it('marks one person as contacted so they drop off the list', async () => {
    const cookie = await admin();
    const p = await makeProduct(0);
    const n = await StockNotification.create({ product: p._id, sizeLabel: '55ml', phone: '01012345678' });

    await request(app)
      .put(`/api/admin/waitlist/${String(n._id)}/notified`)
      .set('Cookie', cookie)
      .send({ notified: true })
      .expect(200);

    const after = await StockNotification.findById(n._id).lean();
    expect(after!.notified).toBe(true);
    const list = await request(app).get('/api/admin/waitlist').set('Cookie', cookie).expect(200);
    expect(list.body).toEqual([]);
  });

  it('404s an unknown id', async () => {
    const cookie = await admin();
    await request(app)
      .put('/api/admin/waitlist/6a45a0276795a3934c23eeed/notified')
      .set('Cookie', cookie)
      .send({ notified: true })
      .expect(404);
  });
});
