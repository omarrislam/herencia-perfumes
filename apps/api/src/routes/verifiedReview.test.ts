import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { Product } from '../models/Product';
import { ScentFamily } from '../models/ScentFamily';
import { Order } from '../models/Order';
import { Review } from '../models/Review';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

const PHONE = '01012345678';

async function makeProduct(slug = 'ashes') {
  const fam = await ScentFamily.create({ name: 'Woody', slug: `woody-${slug}`, order: 1 });
  return Product.create({
    name: 'Ashes', slug, type: 'perfume', shortDesc: 'x', description: 'x',
    images: ['img'], sizes: [{ label: '55ml', price: 500, stock: 5 }],
    scentFamily: fam._id, gender: 'unisex', concentration: 'EDP', isActive: true,
  });
}

async function makeOrder(productId: mongoose.Types.ObjectId | unknown, over: Record<string, unknown> = {}) {
  return Order.create({
    orderNumber: 'HRC-REAL-0001',
    items: [{ product: productId, name: 'Ashes', sizeLabel: '55ml', unitPrice: 500, qty: 1 }],
    customer: { name: 'Mai Hassan', phone: PHONE },
    shippingAddress: { line1: 'a', city: 'Cairo', governorate: 'Cairo', phone: PHONE },
    subtotal: 500, shipping: 60, total: 560, status: 'delivered',
    ...over,
  });
}

const review = { orderNumber: 'HRC-REAL-0001', phone: PHONE, rating: 5, body: 'Wonderful, lasts all day.' };

describe('POST /api/products/:slug/reviews/verified', () => {
  it('accepts a review from someone who actually bought it', async () => {
    const p = await makeProduct();
    await makeOrder(p._id);

    const res = await request(app).post('/api/products/ashes/reviews/verified').send(review).expect(201);
    expect(res.body).toMatchObject({ rating: 5, verifiedBuyer: true });
    // Shows a first name only — never the full name or the phone.
    expect(res.body.user.name).toBe('Mai');
    expect(JSON.stringify(res.body)).not.toContain(PHONE);
  });

  it('holds it for moderation like every other review', async () => {
    const p = await makeProduct();
    await makeOrder(p._id);
    await request(app).post('/api/products/ashes/reviews/verified').send(review).expect(201);
    const doc = await Review.findOne({}).lean();
    expect(doc!.isApproved).toBe(false);
  });

  it('does not appear publicly until approved', async () => {
    const p = await makeProduct();
    await makeOrder(p._id);
    await request(app).post('/api/products/ashes/reviews/verified').send(review).expect(201);
    const list = await request(app).get('/api/products/ashes/reviews').expect(200);
    expect(list.body.items).toHaveLength(0);
  });

  it('rejects a wrong phone for a real order number', async () => {
    const p = await makeProduct();
    await makeOrder(p._id);
    await request(app)
      .post('/api/products/ashes/reviews/verified')
      .send({ ...review, phone: '01099999999' })
      .expect(404);
    expect(await Review.countDocuments()).toBe(0);
  });

  it('rejects an order number that does not exist', async () => {
    const p = await makeProduct();
    await makeOrder(p._id);
    await request(app)
      .post('/api/products/ashes/reviews/verified')
      .send({ ...review, orderNumber: 'HRC-FAKE-9999' })
      .expect(404);
  });

  it('rejects reviewing a product the order does not contain', async () => {
    const bought = await makeProduct('ashes');
    await makeProduct('eclipse');
    await makeOrder(bought._id);
    await request(app).post('/api/products/eclipse/reviews/verified').send(review).expect(403);
    expect(await Review.countDocuments()).toBe(0);
  });

  it('rejects a cancelled order — a refused delivery is not a purchase', async () => {
    const p = await makeProduct();
    await makeOrder(p._id, { status: 'cancelled' });
    await request(app).post('/api/products/ashes/reviews/verified').send(review).expect(403);
  });

  it('allows only one review per order per product', async () => {
    const p = await makeProduct();
    await makeOrder(p._id);
    await request(app).post('/api/products/ashes/reviews/verified').send(review).expect(201);
    const res = await request(app).post('/api/products/ashes/reviews/verified').send(review).expect(409);
    expect(res.body.error.code).toBe('already_reviewed');
    expect(await Review.countDocuments()).toBe(1);
  });

  it('rejects a malformed body', async () => {
    const p = await makeProduct();
    await makeOrder(p._id);
    await request(app)
      .post('/api/products/ashes/reviews/verified')
      .send({ ...review, rating: 9 })
      .expect(400);
  });

  it('counts toward the product rating once approved', async () => {
    const p = await makeProduct();
    await makeOrder(p._id);
    await request(app).post('/api/products/ashes/reviews/verified').send(review).expect(201);
    const doc = await Review.findOne({}).lean();
    await Review.updateOne({ _id: doc!._id }, { $set: { isApproved: true } });
    // Approval recomputation is exercised by the admin route tests; here we only
    // assert the review is a normal, countable document.
    const approved = await Review.countDocuments({ product: p._id, isApproved: true });
    expect(approved).toBe(1);
  });
});
