import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';

const dist = mkdtempSync(join(tmpdir(), 'webdist-'));
writeFileSync(
  join(dist, 'index.html'),
  '<!doctype html><html><head><title>HERENCIA</title></head><body><div id="root"></div></body></html>',
);
const app = createApp({ clientOrigin: 'http://localhost:5173', webDist: dist, origin: 'https://herencia.example' });

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

describe('SPA + SEO injection', () => {
  it('injects product meta into index.html on a detail route', async () => {
    const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    await Product.create({
      name: 'Royal Oud', type: 'perfume', shortDesc: 'A regal oud.', description: 'd', images: ['herencia/royal-oud'],
      sizes: [{ label: '50ml', price: 1200, stock: 5 }], scentFamily: fam._id,
      notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
    });
    const res = await request(app).get('/products/royal-oud');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Royal Oud — HERENCIA</title>');
    expect(res.text).toContain('application/ld+json');
    expect(res.text).toContain('<div id="root">');
  });

  it('serves robots.txt and sitemap.xml', async () => {
    const robots = await request(app).get('/robots.txt');
    expect(robots.status).toBe(200);
    expect(robots.text).toContain('Disallow: /admin');
    const sitemap = await request(app).get('/sitemap.xml');
    expect(sitemap.status).toBe(200);
    expect(sitemap.text).toContain('<urlset');
  });

  it('still returns JSON 404 for unknown api routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
