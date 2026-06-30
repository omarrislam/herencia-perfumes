import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildHeadTags, buildSitemap, ROBOTS_TXT, toAbsoluteImageUrl } from './seo';

afterEach(() => {
  vi.unstubAllEnvs();
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
