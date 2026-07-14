import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const ADMIN = authCookie('000000000000000000000001', 'admin');

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

function validProduct(scentFamily: string) {
  return {
    name: 'Royal Oud', type: 'perfume', shortDesc: 'Regal', description: 'Long',
    images: ['herencia/royal-oud'], sizes: [{ label: '50ml', price: 1200, stock: 5 }],
    scentFamily, notes: { top: ['Bergamot'], heart: ['Rose'], base: ['Oud'] },
    gender: 'unisex', concentration: 'EDP',
  };
}

describe('admin auth guard', () => {
  it('rejects requests without the admin token', async () => {
    const res = await request(app).post('/api/admin/scent-families').send({ name: 'Woody' });
    expect(res.status).toBe(401);
  });
  it('rejects a non-admin user with 403', async () => {
    const res = await request(app).post('/api/admin/scent-families')
      .set('Cookie', authCookie('000000000000000000000002', 'customer')).send({ name: 'Woody' });
    expect(res.status).toBe(403);
  });
});

describe('admin scent-families', () => {
  it('creates a family with the token', async () => {
    const res = await request(app).post('/api/admin/scent-families').set('Cookie', ADMIN).send({ name: 'Woody' });
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('woody');
  });
});

describe('admin products', () => {
  it('creates, updates, and deletes a product', async () => {
    const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    const create = await request(app).post('/api/admin/products').set('Cookie', ADMIN).send(validProduct(String(fam._id)));
    expect(create.status).toBe(201);
    expect(create.body.basePrice).toBe(1200);
    const id = create.body.id;

    const update = await request(app).put(`/api/admin/products/${id}`).set('Cookie', ADMIN)
      .send({ ...validProduct(String(fam._id)), name: 'Royal Oud Reserve' });
    expect(update.status).toBe(200);
    expect(update.body.name).toBe('Royal Oud Reserve');

    const del = await request(app).delete(`/api/admin/products/${id}`).set('Cookie', ADMIN);
    expect(del.status).toBe(204);
    expect(await Product.countDocuments()).toBe(0);
  });

  it('keeps the existing slug when a rename omits it (URLs must not silently break)', async () => {
    // Regression: PUT used to regenerate the slug from the name on every edit.
    // The admin form never sends a slug, so editing the seeded "Perfume Sample"
    // (name ≠ slug 'sample-box') detached it from the storefront lookup and the
    // boot seeder created a duplicate.
    const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    const doc = await Product.create({
      ...validProduct(String(fam._id)),
      name: 'Perfume Sample',
      slug: 'sample-box',
      type: 'sample',
      scentFamily: undefined,
      basePrice: 60,
      sizes: [{ label: '2ml', price: 60, stock: 999 }],
    });

    const update = await request(app).put(`/api/admin/products/${doc._id}`).set('Cookie', ADMIN)
      .send({
        ...validProduct(String(fam._id)),
        name: 'Perfume Sample',
        type: 'sample',
        scentFamily: '',
        sizes: [{ label: '5ml', price: 80, stock: 999 }],
      });
    expect(update.status).toBe(200);
    expect(update.body.slug).toBe('sample-box'); // preserved, NOT 'perfume-sample'
    expect(update.body.sizes[0].label).toBe('5ml');

    // An explicit slug in the payload still renames.
    const explicit = await request(app).put(`/api/admin/products/${doc._id}`).set('Cookie', ADMIN)
      .send({ ...validProduct(String(fam._id)), name: 'Perfume Sample', type: 'sample', scentFamily: '', slug: 'new-slug' });
    expect(explicit.status).toBe(200);
    expect(explicit.body.slug).toBe('new-slug');
  });

  it('rejects an invalid product with 400', async () => {
    const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    const res = await request(app).post('/api/admin/products').set('Cookie', ADMIN)
      .send({ ...validProduct(String(fam._id)), sizes: [] });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a malformed product id', async () => {
    const res = await request(app)
      .delete('/api/admin/products/not-a-valid-id')
      .set('Cookie', ADMIN);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('invalid_id');
  });

  it('returns 409 on duplicate scent-family slug', async () => {
    const first = await request(app)
      .post('/api/admin/scent-families')
      .set('Cookie', ADMIN)
      .send({ name: 'Woody' });
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/admin/scent-families')
      .set('Cookie', ADMIN)
      .send({ name: 'Woody' });
    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('conflict');
  });

  it('creates a bundle product referencing an existing perfume', async () => {
    const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    const perfumeRes = await request(app)
      .post('/api/admin/products')
      .set('Cookie', ADMIN)
      .send(validProduct(String(fam._id)));
    expect(perfumeRes.status).toBe(201);
    const perfumeId: string = perfumeRes.body.id;

    const bundleRes = await request(app)
      .post('/api/admin/products')
      .set('Cookie', ADMIN)
      .send({
        ...validProduct(String(fam._id)),
        name: 'Oud Bundle',
        type: 'bundle',
        bundleItems: [{ product: perfumeId, qty: 1 }],
      });
    expect(bundleRes.status).toBe(201);
    expect(bundleRes.body.type).toBe('bundle');
  });
});
