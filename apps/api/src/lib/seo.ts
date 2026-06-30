import type { ProductDTO } from '@herencia/shared';
import { Product } from '../models/Product';
import { toProductDTO } from './serialize';

export type RouteMeta = {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  jsonLd?: string;
};

const BRAND = 'HERENCIA';
const DEFAULT_DESC = 'Heritage luxury perfumery. Luxury in every drop.';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const STATIC_META: Record<string, { title: string; description: string }> = {
  '/': { title: `${BRAND} — Luxury in every drop`, description: DEFAULT_DESC },
  '/products': { title: `Shop Perfumes — ${BRAND}`, description: 'Browse the HERENCIA perfume collection.' },
  '/bundles': { title: `Bundles — ${BRAND}`, description: 'Curated HERENCIA perfume bundles.' },
  '/about': { title: `About — ${BRAND}`, description: 'The HERENCIA story.' },
  '/contact': { title: `Contact — ${BRAND}`, description: 'Get in touch with HERENCIA.' },
};

export function productJsonLd(p: ProductDTO, canonical: string): string {
  const offer = {
    '@type': 'Offer',
    price: p.basePrice,
    priceCurrency: 'EGP',
    availability:
      p.sizes.some((s) => s.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    url: canonical,
  };
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.shortDesc,
    brand: { '@type': 'Brand', name: BRAND },
    offers: offer,
  };
  if (p.rating.count > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: p.rating.avg,
      reviewCount: p.rating.count,
    };
  }
  return JSON.stringify(data);
}

export async function routeMetaForPath(path: string): Promise<RouteMeta> {
  const clean = path.split('?')[0]!.replace(/\/+$/, '') || '/';

  const detail = clean.match(/^\/(products|bundles)\/([^/]+)$/);
  if (detail) {
    const slug = detail[2]!;
    const doc = await Product.findOne({ slug, isActive: true }).lean();
    if (doc) {
      const dto = toProductDTO(doc);
      const canonical = `/${detail[1]}/${slug}`;
      return {
        title: dto.seo.title ?? `${dto.name} — ${BRAND}`,
        description: dto.seo.description ?? dto.shortDesc,
        canonicalPath: canonical,
        image: dto.images[0],
        jsonLd: productJsonLd(dto, canonical),
      };
    }
  }

  const stat = STATIC_META[clean];
  if (stat) return { ...stat, canonicalPath: clean };
  return { title: `${BRAND} — Luxury in every drop`, description: DEFAULT_DESC, canonicalPath: clean };
}

export function buildHeadTags(meta: RouteMeta, origin = ''): string {
  const url = `${origin}${meta.canonicalPath}`;
  const desc = escapeHtml(meta.description);
  const title = escapeHtml(meta.title);
  const parts = [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ];
  if (meta.image) parts.push(`<meta property="og:image" content="${escapeHtml(meta.image)}" />`);
  if (meta.jsonLd) parts.push(`<script type="application/ld+json">${meta.jsonLd}</script>`);
  return parts.join('\n    ');
}

export function buildSitemap(origin: string, products: { slug: string; type: string }[]): string {
  const staticPaths = ['/', '/products', '/bundles', '/about', '/contact'];
  const urls = [
    ...staticPaths.map((p) => `${origin}${p}`),
    ...products.map((p) => `${origin}/${p.type === 'bundle' ? 'bundles' : 'products'}/${p.slug}`),
  ];
  const body = urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export const ROBOTS_TXT = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Sitemap: /sitemap.xml', ''].join('\n');
