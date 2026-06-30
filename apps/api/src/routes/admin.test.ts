import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';

const TOKEN = 'test-admin-token-1234';
const app = createApp({ clientOrigin: 'http://localhost:5173', adminToken: TOKEN });

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
});

describe('admin scent-families', () => {
  it('creates a family with the token', async () => {
    const res = await request(app).post('/api/admin/scent-families').set('x-admin-token', TOKEN).send({ name: 'Woody' });
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('woody');
  });
});

describe('admin products', () => {
  it('creates, updates, and deletes a product', async () => {
    const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    const create = await request(app).post('/api/admin/products').set('x-admin-token', TOKEN).send(validProduct(String(fam._id)));
    expect(create.status).toBe(201);
    expect(create.body.basePrice).toBe(1200);
    const id = create.body.id;

    const update = await request(app).put(`/api/admin/products/${id}`).set('x-admin-token', TOKEN)
      .send({ ...validProduct(String(fam._id)), name: 'Royal Oud Reserve' });
    expect(update.status).toBe(200);
    expect(update.body.name).toBe('Royal Oud Reserve');

    const del = await request(app).delete(`/api/admin/products/${id}`).set('x-admin-token', TOKEN);
    expect(del.status).toBe(204);
    expect(await Product.countDocuments()).toBe(0);
  });

  it('rejects an invalid product with 400', async () => {
    const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    const res = await request(app).post('/api/admin/products').set('x-admin-token', TOKEN)
      .send({ ...validProduct(String(fam._id)), sizes: [] });
    expect(res.status).toBe(400);
  });
});
