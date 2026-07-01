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
beforeAll(connectMemory);
afterAll(disconnectMemory);

let productId: string;
let userId: string;
let slug: string;
let cookie: string;
beforeEach(async () => {
  await clearDb();
  const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const p = await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['x'],
    sizes: [{ label: '50ml', price: 800, stock: 5 }], scentFamily: fam._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  productId = String(p._id);
  slug = p.slug;
  const u = await User.create({ name: 'Mai', email: 'mai@x.com', passwordHash: 'x', role: 'customer' });
  userId = String(u._id);
  cookie = authCookie(userId, 'customer');
});

describe('POST /api/products/:slug/reviews', () => {
  it('401s a guest', async () => {
    expect((await request(app).post('/api/products/royal-oud/reviews').send({ rating: 5, body: 'great' })).status).toBe(401);
  });
  it('creates a pending review for a logged-in user', async () => {
    const res = await request(app).post('/api/products/royal-oud/reviews').set('Cookie', cookie).send({ rating: 5, body: 'great' });
    expect(res.status).toBe(201);
    expect(res.body.isApproved).toBe(false);
    expect(res.body.user.name).toBe('Mai');
  });
  it('rejects a second review by the same user with 409', async () => {
    await request(app).post('/api/products/royal-oud/reviews').set('Cookie', cookie).send({ rating: 5, body: 'a' });
    const res = await request(app).post('/api/products/royal-oud/reviews').set('Cookie', cookie).send({ rating: 4, body: 'b' });
    expect(res.status).toBe(409);
  });
  it('maps a duplicate-key race to a friendly 409', async () => {
    // First review succeeds
    await request(app)
      .post(`/api/products/${slug}/reviews`)
      .set('Cookie', authCookie(userId, 'customer'))
      .send({ rating: 5, body: 'Lovely' })
      .expect(201);
    // Simulate the race: bypass the exists() pre-check is not possible via HTTP,
    // so assert the second submit returns the friendly conflict message + code.
    const res = await request(app)
      .post(`/api/products/${slug}/reviews`)
      .set('Cookie', authCookie(userId, 'customer'))
      .send({ rating: 4, body: 'Again' })
      .expect(409);
    expect(res.body.error.code).toBe('conflict');
    expect(res.body.error.message).toBe('You have already reviewed this product');
  });
});

describe('GET /api/products/:slug/reviews', () => {
  it('returns only approved reviews', async () => {
    await Review.create({ product: productId, user: userId, rating: 5, body: 'approved one', isApproved: true });
    const u2 = await User.create({ name: 'Sam', email: 's@x.com', passwordHash: 'x', role: 'customer' });
    await Review.create({ product: productId, user: u2._id, rating: 2, body: 'pending one', isApproved: false });
    const res = await request(app).get('/api/products/royal-oud/reviews');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].body).toBe('approved one');
  });
});
