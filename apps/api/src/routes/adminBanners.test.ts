import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const ADMIN = authCookie('000000000000000000000001', 'admin');
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

const valid = { title: 'Summer Sale', image: 'banners/summer', placement: 'home_hero', order: 1 };

describe('admin banners', () => {
  it('403s a customer', async () => {
    expect((await request(app).post('/api/admin/banners').set('Cookie', authCookie('000000000000000000000002', 'customer')).send(valid)).status).toBe(403);
  });
  it('creates, lists (incl inactive), updates, deletes', async () => {
    const c = await request(app).post('/api/admin/banners').set('Cookie', ADMIN).send(valid);
    expect(c.status).toBe(201);
    const id = c.body.id;
    const list = await request(app).get('/api/admin/banners').set('Cookie', ADMIN);
    expect(list.body).toHaveLength(1);
    const u = await request(app).put(`/api/admin/banners/${id}`).set('Cookie', ADMIN).send({ ...valid, isActive: false });
    expect(u.body.isActive).toBe(false);
    const d = await request(app).delete(`/api/admin/banners/${id}`).set('Cookie', ADMIN);
    expect(d.status).toBe(204);
  });
  it('rejects an invalid placement (400)', async () => {
    const res = await request(app).post('/api/admin/banners').set('Cookie', ADMIN).send({ ...valid, placement: 'nope' });
    expect(res.status).toBe(400);
  });
});
