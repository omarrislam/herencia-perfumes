import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';

const app = createApp({ clientOrigin: 'http://localhost:5173', adminToken: 'test-admin-token-1234' });

beforeAll(connectMemory);
afterAll(disconnectMemory);

beforeEach(async () => {
  await clearDb();
  const woody = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const floral = await ScentFamily.create({ name: 'Floral', slug: 'floral', order: 2 });
  await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['x'],
    sizes: [{ label: '50ml', price: 1200, stock: 5 }], scentFamily: woody._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP', isFeatured: true,
  });
  await Product.create({
    name: 'Rose Veil', type: 'perfume', shortDesc: 's', description: 'd', images: ['x'],
    sizes: [{ label: '50ml', price: 800, stock: 2 }], scentFamily: floral._id,
    notes: { top: [], heart: [], base: [] }, gender: 'women', concentration: 'EDT',
  });
  await Product.create({
    name: 'Hidden Gem', type: 'perfume', shortDesc: 's', description: 'd', images: ['x'],
    sizes: [{ label: '50ml', price: 500, stock: 0 }], scentFamily: woody._id,
    notes: { top: [], heart: [], base: [] }, gender: 'men', concentration: 'EDT', isActive: false,
  });
  await Product.create({
    name: 'Woody Bundle', type: 'bundle', shortDesc: 's', description: 'd', images: ['x'],
    sizes: [{ label: 'set', price: 1500, stock: 3 }], scentFamily: woody._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'Other',
    bundleItems: [{ product: (await Product.findOne({ slug: 'royal-oud' }))!._id, qty: 1 }],
  });
});

describe('GET /api/scent-families', () => {
  it('returns families ordered by order', async () => {
    const res = await request(app).get('/api/scent-families');
    expect(res.status).toBe(200);
    expect(res.body.map((f: { name: string }) => f.name)).toEqual(['Woody', 'Floral']);
  });
});

describe('GET /api/products', () => {
  it('lists only active products with paging envelope', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(3);
    expect(res.body.page).toBe(1);
    expect(res.body.items.every((p: { isActive: boolean }) => p.isActive)).toBe(true);
  });
  it('filters by gender', async () => {
    const res = await request(app).get('/api/products?gender=women');
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].name).toBe('Rose Veil');
  });
  it('sorts by price ascending', async () => {
    const res = await request(app).get('/api/products?sort=price-asc');
    expect(res.body.items[0].name).toBe('Rose Veil');
  });
  it('rejects an invalid sort with 400', async () => {
    const res = await request(app).get('/api/products?sort=banana');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/products/:slug', () => {
  it('returns a product with populated scentFamily', async () => {
    const res = await request(app).get('/api/products/royal-oud');
    expect(res.status).toBe(200);
    expect(res.body.scentFamily.name).toBe('Woody');
  });
  it('404s for an inactive product', async () => {
    const res = await request(app).get('/api/products/hidden-gem');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/products/:slug/related', () => {
  it('returns same-family products excluding self', async () => {
    const res = await request(app).get('/api/products/royal-oud/related');
    expect(res.status).toBe(200);
    expect(res.body.every((p: { slug: string }) => p.slug !== 'royal-oud')).toBe(true);
  });
  it('excludes products of a different type from related', async () => {
    const res = await request(app).get('/api/products/royal-oud/related');
    expect(res.status).toBe(200);
    expect(res.body.every((p: { type: string }) => p.type === 'perfume')).toBe(true);
  });
});
