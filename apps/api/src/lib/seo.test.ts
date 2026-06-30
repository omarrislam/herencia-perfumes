import { describe, it, expect } from 'vitest';
import { buildHeadTags, buildSitemap, ROBOTS_TXT } from './seo';

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
