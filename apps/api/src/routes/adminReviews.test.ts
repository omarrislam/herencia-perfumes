import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';
import { User } from '../models/User';
import { Review } from '../models/Review';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const ADMIN = authCookie('000000000000000000000001', 'admin');
beforeAll(connectMemory);
afterAll(disconnectMemory);

let productId: string;
let reviewId: string;
beforeEach(async () => {
  await clearDb();
  const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const p = await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['x'],
    sizes: [{ label: '50ml', price: 800, stock: 5 }], scentFamily: fam._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  productId = String(p._id);
  const u = await User.create({ name: 'Mai', email: 'mai@x.com', passwordHash: 'x', role: 'customer' });
  const r = await Review.create({ product: p._id, user: u._id, rating: 4, body: 'nice', isApproved: false });
  reviewId = String(r._id);
});

describe('admin reviews', () => {
  it('403s a customer', async () => {
    expect((await request(app).get('/api/admin/reviews').set('Cookie', authCookie('000000000000000000000002', 'customer'))).status).toBe(403);
  });
  it('lists the pending queue', async () => {
    const res = await request(app).get('/api/admin/reviews?status=pending').set('Cookie', ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
  });
  it('approving recomputes product rating', async () => {
    const res = await request(app).put(`/api/admin/reviews/${reviewId}`).set('Cookie', ADMIN).send({ isApproved: true });
    expect(res.status).toBe(200);
    expect(res.body.isApproved).toBe(true);
    const product = await Product.findById(productId).lean();
    expect(product!.rating.count).toBe(1);
    expect(product!.rating.avg).toBe(4);
  });
  it('deleting an approved review recomputes rating back to 0', async () => {
    await request(app).put(`/api/admin/reviews/${reviewId}`).set('Cookie', ADMIN).send({ isApproved: true });
    const del = await request(app).delete(`/api/admin/reviews/${reviewId}`).set('Cookie', ADMIN);
    expect(del.status).toBe(204);
    const product = await Product.findById(productId).lean();
    expect(product!.rating.count).toBe(0);
  });
});
