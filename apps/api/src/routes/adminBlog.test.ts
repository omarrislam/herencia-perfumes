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

const valid = { title: 'Notes on Oud', excerpt: 'A primer', body: '# Oud', coverImage: 'blog/oud', tags: ['oud'], isPublished: true };

describe('admin blog', () => {
  it('403s a customer', async () => {
    expect((await request(app).post('/api/admin/blog').set('Cookie', authCookie('000000000000000000000002', 'customer')).send(valid)).status).toBe(403);
  });
  it('creates (auto-slug + publishedAt), lists incl drafts, updates, deletes', async () => {
    const c = await request(app).post('/api/admin/blog').set('Cookie', ADMIN).send(valid);
    expect(c.status).toBe(201);
    expect(c.body.slug).toBe('notes-on-oud');
    expect(c.body.publishedAt).toBeTruthy();
    const id = c.body.id;
    const list = await request(app).get('/api/admin/blog').set('Cookie', ADMIN);
    expect(list.body.items ?? list.body).toBeTruthy();
    const u = await request(app).put(`/api/admin/blog/${id}`).set('Cookie', ADMIN).send({ ...valid, title: 'Updated Oud' });
    expect(u.body.title).toBe('Updated Oud');
    const d = await request(app).delete(`/api/admin/blog/${id}`).set('Cookie', ADMIN);
    expect(d.status).toBe(204);
  });
  it('409s a duplicate slug', async () => {
    await request(app).post('/api/admin/blog').set('Cookie', ADMIN).send(valid);
    const res = await request(app).post('/api/admin/blog').set('Cookie', ADMIN).send(valid);
    expect(res.status).toBe(409);
  });
  it('admin GET includes draft (isPublished:false) posts (M3-min-7)', async () => {
    await request(app).post('/api/admin/blog').set('Cookie', ADMIN).send({ ...valid, title: 'Draft Post', isPublished: false });
    const list = await request(app).get('/api/admin/blog').set('Cookie', ADMIN).expect(200);
    const items: Array<{ isPublished: boolean; title: string }> = list.body.items ?? list.body;
    expect(items.some((p) => p.title === 'Draft Post' && p.isPublished === false)).toBe(true);
  });
});
