import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { buildHeadTags, buildSitemap, ROBOTS_TXT, toAbsoluteImageUrl, routeMetaForPath, articleJsonLd } from './seo';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { BlogPost } from '../models/BlogPost';
import { Product } from '../models/Product';
import { ScentFamily } from '../models/ScentFamily';

beforeAll(connectMemory);
afterAll(disconnectMemory);

afterEach(() => {
  vi.unstubAllEnvs();
  return clearDb();
});

describe('buildHeadTags', () => {
  it('escapes and includes title, description, canonical', () => {
    const html = buildHeadTags({
      title: 'Royal Oud — HERENCIA',
      description: 'A regal oud & rose.',
      canonicalPath: '/products/royal-oud',
    });
    expect(html).toContain('<title>Royal Oud — HERENCIA</title>');
    expect(html).toContain('A regal oud &amp; rose.');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('og:title');
  });

  it('escapes <, >, and " in title and description', () => {
    const html = buildHeadTags({
      title: 'Scent <Gold> "Edition"',
      description: 'A <great> "smell".',
      canonicalPath: '/products/scent-gold',
    });
    // Escaped forms must appear
    expect(html).toContain('&lt;Gold&gt;');
    expect(html).toContain('&quot;Edition&quot;');
    expect(html).toContain('&lt;great&gt;');
    expect(html).toContain('&quot;smell&quot;');
    // Raw injection characters must NOT appear in title/desc positions
    expect(html).not.toContain('<Gold>');
    expect(html).not.toContain('"Edition"');
  });
});

describe('buildSitemap', () => {
  it('lists static routes and product urls', () => {
    const xml = buildSitemap('https://herencia.example', [{ slug: 'royal-oud', type: 'perfume' }]);
    expect(xml).toContain('<loc>https://herencia.example/</loc>');
    expect(xml).toContain('<loc>https://herencia.example/products/royal-oud</loc>');
  });
});

describe('ROBOTS_TXT', () => {
  it('disallows /admin and references the sitemap', () => {
    expect(ROBOTS_TXT).toContain('Disallow: /admin');
    expect(ROBOTS_TXT).toContain('Sitemap:');
  });
});

describe('toAbsoluteImageUrl', () => {
  it('returns already-absolute URLs unchanged', () => {
    expect(toAbsoluteImageUrl('https://example.com/img.jpg')).toBe('https://example.com/img.jpg');
    expect(toAbsoluteImageUrl('http://cdn.example.com/img.png')).toBe('http://cdn.example.com/img.png');
  });

  it('converts a public_id to an absolute Cloudinary URL when CLOUDINARY_CLOUD_NAME is set', () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'herencia-prod');
    expect(toAbsoluteImageUrl('herencia/royal-oud')).toBe(
      'https://res.cloudinary.com/herencia-prod/image/upload/herencia/royal-oud',
    );
  });

  it('returns undefined for a public_id when CLOUDINARY_CLOUD_NAME is not set', () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', '');
    expect(toAbsoluteImageUrl('herencia/royal-oud')).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(toAbsoluteImageUrl(undefined)).toBeUndefined();
  });
});

describe('product SEO — bottle size', () => {
  async function makeProduct(sizes: { label: string; price: number; stock: number }[]) {
    const family = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    await Product.create({
      name: 'Ashes', slug: 'ashes', type: 'perfume', shortDesc: 'Warm and addictive.',
      description: 'x', images: ['herencia/ashes'], sizes, scentFamily: family._id,
      gender: 'unisex', concentration: 'EDP', isActive: true,
    });
  }

  it('puts the bottle size and concentration in the title', async () => {
    await makeProduct([{ label: '55ml', price: 500, stock: 14 }]);
    const meta = await routeMetaForPath('/products/ashes');
    expect(meta.title).toBe('Ashes — 55ml EDP — HERENCIA');
  });

  it('exposes the size in the Product JSON-LD', async () => {
    await makeProduct([{ label: '55ml', price: 500, stock: 14 }]);
    const meta = await routeMetaForPath('/products/ashes');
    expect(meta.jsonLd).toContain('"size":"55ml"');
  });

  it('omits size from the title when a product has several', async () => {
    await makeProduct([
      { label: '55ml', price: 500, stock: 14 },
      { label: '100ml', price: 900, stock: 4 },
    ]);
    const meta = await routeMetaForPath('/products/ashes');
    expect(meta.title).toBe('Ashes — EDP — HERENCIA');
    expect(meta.jsonLd).not.toContain('"size"');
  });

  it('still respects an admin-authored SEO title', async () => {
    const family = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    await Product.create({
      name: 'Ashes', slug: 'ashes', type: 'perfume', shortDesc: 'x', description: 'x',
      images: ['herencia/ashes'], sizes: [{ label: '55ml', price: 500, stock: 1 }],
      scentFamily: family._id, gender: 'unisex', concentration: 'EDP', isActive: true,
      seo: { title: 'Hand-written title' },
    });
    const meta = await routeMetaForPath('/products/ashes');
    expect(meta.title).toBe('Hand-written title');
  });
});

describe('blog SEO', () => {
  it('builds Article meta + JSON-LD for a published post', async () => {
    await BlogPost.create({
      title: 'Notes on Oud', slug: 'notes-on-oud', excerpt: 'A primer on oud', body: '# Oud',
      coverImage: 'blog/oud', tags: ['oud'], isPublished: true, publishedAt: new Date(),
    });
    const meta = await routeMetaForPath('/blog/notes-on-oud');
    expect(meta.title).toContain('Notes on Oud');
    expect(meta.description).toBe('A primer on oud');
    expect(meta.jsonLd).toContain('"@type":"Article"');
    expect(meta.canonicalPath).toBe('/blog/notes-on-oud');
  });
  it('omits a draft post from sitemap helper input and falls back to default meta', async () => {
    const meta = await routeMetaForPath('/blog/does-not-exist');
    expect(meta.title).toContain('HERENCIA');
  });
  it('real draft post (isPublished:false) falls back to default meta — draft does not leak (M3-min-8)', async () => {
    await BlogPost.create({
      title: 'Secret Draft', slug: 'secret-draft', excerpt: 'Hidden content', body: '# Draft',
      coverImage: 'blog/draft', tags: [], isPublished: false,
    });
    const meta = await routeMetaForPath('/blog/secret-draft');
    expect(meta.title).toContain('HERENCIA');
    expect(meta.description).not.toContain('Hidden content');
    expect(meta.jsonLd).toBeUndefined();
  });
  it('Article JSON-LD escapes < in fields to \\u003c (M3-min-8)', () => {
    const ld = articleJsonLd(
      { title: 'A <script>alert(1)</script> title', excerpt: 'Smells <good>', coverImage: 'blog/x' },
      '/blog/x',
    );
    expect(ld).not.toContain('<script>');
    expect(ld).not.toContain('<good>');
    expect(ld).toContain('\\u003c');
  });
  it('includes blog slugs in the sitemap', () => {
    const xml = buildSitemap('https://h.test', [{ slug: 'royal-oud', type: 'perfume' }], ['notes-on-oud']);
    expect(xml).toContain('https://h.test/blog/notes-on-oud');
    expect(xml).toContain('https://h.test/blog');
  });
});
