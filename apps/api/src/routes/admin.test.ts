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

describe('GET /api/admin/products', () => {
  async function seedPair() {
    const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    const base = validProduct(String(fam._id));
    await Product.create({ ...base, name: 'Visible One' });
    await Product.create({ ...base, name: 'Hidden One', isActive: false });
  }

  // The public catalog filters isActive, which used to make a deactivated
  // product unreachable from the only screen that can switch it back on.
  it('includes deactivated products, unlike the public catalog', async () => {
    await seedPair();
    const admin = await request(app).get('/api/admin/products').set('Cookie', ADMIN);
    expect(admin.status).toBe(200);
    expect(admin.body.total).toBe(2);
    expect(admin.body.items.map((p: { name: string }) => p.name).sort()).toEqual(['Hidden One', 'Visible One']);

    const publicList = await request(app).get('/api/products');
    expect(publicList.body.total).toBe(1);
  });

  it('paginates and reports totals', async () => {
    await seedPair();
    const res = await request(app).get('/api/admin/products?limit=1').set('Cookie', ADMIN);
    expect(res.body).toMatchObject({ total: 2, page: 1, pages: 2 });
    expect(res.body.items).toHaveLength(1);
    const page2 = await request(app).get('/api/admin/products?limit=1&page=2').set('Cookie', ADMIN);
    expect(page2.body.items).toHaveLength(1);
    expect(page2.body.items[0].id).not.toBe(res.body.items[0].id);
  });

  it('filters by name and 403s a customer', async () => {
    await seedPair();
    const res = await request(app).get('/api/admin/products?q=hidden').set('Cookie', ADMIN);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].name).toBe('Hidden One');
    const denied = await request(app).get('/api/admin/products').set('Cookie', authCookie('000000000000000000000002', 'customer'));
    expect(denied.status).toBe(403);
  });
});

describe('GET /api/admin/stats stock health', () => {
  it('counts low and sold-out units across the whole catalog, samples included', async () => {
    const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    const base = validProduct(String(fam._id));
    await Product.create({
      ...base, name: 'Healthy', sizes: [{ label: '50ml', price: 100, stock: 40 }], sampleStock: 30,
    });
    await Product.create({
      ...base, name: 'Running Out', sizes: [{ label: '50ml', price: 100, stock: 3 }], sampleStock: 0,
    });
    // Deactivated products still need restocking, so they must be counted.
    await Product.create({
      ...base, name: 'Hidden Sold Out', isActive: false,
      sizes: [{ label: '50ml', price: 100, stock: 0 }], sampleStock: 2,
    });

    const res = await request(app).get('/api/admin/stats').set('Cookie', ADMIN);
    expect(res.status).toBe(200);
    expect(res.body.products).toBe(3);
    expect(res.body.lowStock).toBe(2); // Running Out 50ml (3) + Hidden sample (2)
    expect(res.body.outOfStock).toBe(2); // Running Out sample (0) + Hidden 50ml (0)
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
    // The admin form never sends a slug, so renaming a product whose name no
    // longer matches its slug must not silently change the storefront URL.
    const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    const doc = await Product.create({
      ...validProduct(String(fam._id)),
      name: 'Perfume Sample',
      slug: 'legacy-sample',
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
    expect(update.body.slug).toBe('legacy-sample'); // preserved, NOT 'perfume-sample'
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
