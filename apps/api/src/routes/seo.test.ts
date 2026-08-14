import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { Product } from '../models/Product';
import { ScentFamily } from '../models/ScentFamily';
import { BlogPost } from '../models/BlogPost';

const app = createApp({ clientOrigin: 'http://localhost:5173', origin: 'https://herencia-eg.com' });
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

async function makeProduct(over: Partial<Record<string, unknown>> = {}) {
  const family = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  return Product.create({
    name: 'Ashes', slug: 'ashes', type: 'perfume', shortDesc: 'Warm and addictive.',
    description: 'x', images: ['herencia/ashes'], sizes: [{ label: '55ml', price: 500, stock: 14 }],
    scentFamily: family._id, gender: 'unisex', concentration: 'EDP', isActive: true, ...over,
  });
}

describe('GET /api/seo/prerender', () => {
  it('returns head tags for every static route', async () => {
    const res = await request(app).get('/api/seo/prerender').expect(200);
    const paths = res.body.routes.map((r: { path: string }) => r.path);
    expect(paths).toContain('/');
    expect(paths).toContain('/products');
    expect(paths).toContain('/blog');
  });

  it('gives each route its own title rather than one shared title', async () => {
    const res = await request(app).get('/api/seo/prerender').expect(200);
    const byPath = Object.fromEntries(res.body.routes.map((r: { path: string; head: string }) => [r.path, r.head]));
    expect(byPath['/']).toContain('<title>HERENCIA — Luxury in every drop</title>');
    expect(byPath['/products']).toContain('<title>Shop Perfumes — HERENCIA</title>');
    expect(byPath['/']).not.toEqual(byPath['/products']);
  });

  it('includes a route per active product, with its size in the title', async () => {
    await makeProduct();
    const res = await request(app).get('/api/seo/prerender').expect(200);
    const entry = res.body.routes.find((r: { path: string }) => r.path === '/products/ashes');
    expect(entry).toBeDefined();
    expect(entry.head).toContain('<title>Ashes — 55ml EDP — HERENCIA</title>');
    expect(entry.head).toContain('"@type":"Product"');
  });

  it('routes bundles under /bundles', async () => {
    await makeProduct({ type: 'bundle', slug: 'woody-duo', name: 'Woody Duo' });
    const res = await request(app).get('/api/seo/prerender').expect(200);
    const paths = res.body.routes.map((r: { path: string }) => r.path);
    expect(paths).toContain('/bundles/woody-duo');
    expect(paths).not.toContain('/products/woody-duo');
  });

  it('excludes inactive products and draft posts', async () => {
    await makeProduct({ slug: 'hidden', isActive: false });
    await BlogPost.create({
      title: 'Draft', slug: 'draft-post', excerpt: 'e', body: 'b', coverImage: 'c', isPublished: false,
    });
    const res = await request(app).get('/api/seo/prerender').expect(200);
    const paths = res.body.routes.map((r: { path: string }) => r.path);
    expect(paths).not.toContain('/products/hidden');
    expect(paths).not.toContain('/blog/draft-post');
  });

  it('includes published blog posts', async () => {
    await BlogPost.create({
      title: 'Notes on Oud', slug: 'notes-on-oud', excerpt: 'A primer', body: 'b',
      coverImage: 'c', isPublished: true, publishedAt: new Date(),
    });
    const res = await request(app).get('/api/seo/prerender').expect(200);
    const entry = res.body.routes.find((r: { path: string }) => r.path === '/blog/notes-on-oud');
    expect(entry.head).toContain('Notes on Oud');
    expect(entry.head).toContain('"@type":"Article"');
  });

  it('builds canonical URLs on the configured origin', async () => {
    const res = await request(app).get('/api/seo/prerender').expect(200);
    const home = res.body.routes.find((r: { path: string }) => r.path === '/');
    expect(home.head).toContain('https://herencia-eg.com/');
  });
});
