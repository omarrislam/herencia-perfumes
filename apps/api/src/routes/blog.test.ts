import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { BlogPost } from '../models/BlogPost';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

async function post(over: Record<string, unknown> = {}) {
  return BlogPost.create({
    title: 'Notes on Oud', slug: 'notes-on-oud', excerpt: 'A primer', body: '# Oud body',
    coverImage: 'blog/oud', tags: ['oud'], isPublished: true, publishedAt: new Date(), ...over,
  });
}

describe('GET /api/blog', () => {
  it('lists published posts without the full body', async () => {
    await post();
    await post({ slug: 'draft', title: 'Draft', isPublished: false, publishedAt: undefined });
    const res = await request(app).get('/api/blog');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].slug).toBe('notes-on-oud');
    expect(res.body.items[0].body).toBeUndefined();
  });
  it('filters by tag', async () => {
    await post();
    await post({ slug: 'fresh', title: 'Fresh', tags: ['citrus'] });
    const res = await request(app).get('/api/blog?tag=citrus');
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].slug).toBe('fresh');
  });
});

describe('GET /api/blog/:slug', () => {
  it('returns a published post with its body', async () => {
    await post();
    const res = await request(app).get('/api/blog/notes-on-oud');
    expect(res.status).toBe(200);
    expect(res.body.body).toBe('# Oud body');
  });
  it('404s a draft', async () => {
    await post({ slug: 'draft', isPublished: false, publishedAt: undefined });
    expect((await request(app).get('/api/blog/draft')).status).toBe(404);
  });
});
