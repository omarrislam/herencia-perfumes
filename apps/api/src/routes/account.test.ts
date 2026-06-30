import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { User } from '../models/User';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });

beforeAll(connectMemory);
afterAll(disconnectMemory);

let cookie: string;
let userId: string;
let productId: string;
beforeEach(async () => {
  await clearDb();
  const u = await User.create({ name: 'Mai', email: 'mai@x.com', passwordHash: 'x', role: 'customer' });
  userId = String(u._id);
  cookie = authCookie(userId, 'customer');
  const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const p = await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['img1'],
    sizes: [{ label: '50ml', price: 800, stock: 5 }], scentFamily: fam._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  productId = String(p._id);
});

describe('profile', () => {
  it('gets and updates the profile', async () => {
    const get = await request(app).get('/api/account/profile').set('Cookie', cookie);
    expect(get.body.email).toBe('mai@x.com');
    const put = await request(app).put('/api/account/profile').set('Cookie', cookie).send({ name: 'Mai K', phone: '0111' });
    expect(put.status).toBe(400); // phone too short → schema rejects
    const ok = await request(app).put('/api/account/profile').set('Cookie', cookie).send({ name: 'Mai K' });
    expect(ok.body.name).toBe('Mai K');
  });
});

describe('addresses', () => {
  const addr = { label: 'Home', line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '0100000000' };
  it('adds, lists, updates, deletes an address', async () => {
    const add = await request(app).post('/api/account/addresses').set('Cookie', cookie).send(addr);
    expect(add.status).toBe(201);
    const id = add.body.id;
    expect(id).toBeTruthy();
    const list = await request(app).get('/api/account/addresses').set('Cookie', cookie);
    expect(list.body).toHaveLength(1);
    const upd = await request(app).put(`/api/account/addresses/${id}`).set('Cookie', cookie).send({ ...addr, city: 'Giza' });
    expect(upd.body.find((a: { id: string; city: string }) => a.id === id).city).toBe('Giza');
    const del = await request(app).delete(`/api/account/addresses/${id}`).set('Cookie', cookie);
    expect(del.status).toBe(200);
    expect(del.body).toHaveLength(0);
  });
});

describe('wishlist', () => {
  it('adds (idempotent), lists populated, removes', async () => {
    await request(app).post('/api/account/wishlist').set('Cookie', cookie).send({ productId });
    await request(app).post('/api/account/wishlist').set('Cookie', cookie).send({ productId }); // idempotent
    const list = await request(app).get('/api/account/wishlist').set('Cookie', cookie);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].slug).toBe('royal-oud');
    const del = await request(app).delete(`/api/account/wishlist/${productId}`).set('Cookie', cookie);
    expect(del.body).toHaveLength(0);
  });
  it('401s a guest', async () => {
    expect((await request(app).get('/api/account/wishlist')).status).toBe(401);
  });
});
