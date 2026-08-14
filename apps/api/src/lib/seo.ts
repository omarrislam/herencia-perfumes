import type { ProductDTO } from '@herencia/shared';
import { Product } from '../models/Product';
import { BlogPost } from '../models/BlogPost';
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

export function toAbsoluteImageUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (value.startsWith('http://') || value.startsWith('https://')) return value;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (cloud) return `https://res.cloudinary.com/${cloud}/image/upload/${value}`;
  return undefined;
}

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
  '/blog': { title: `Journal — ${BRAND}`, description: 'Notes on scent, heritage, and craft from HERENCIA.' },
  '/about': { title: `About — ${BRAND}`, description: 'The HERENCIA story.' },
  '/contact': { title: `Contact — ${BRAND}`, description: 'Get in touch with HERENCIA.' },
};

export function articleJsonLd(post: { title: string; excerpt: string; coverImage: string; publishedAt?: string }, canonical: string): string {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    image: toAbsoluteImageUrl(post.coverImage),
    url: canonical,
    publisher: { '@type': 'Organization', name: BRAND },
  };
  if (post.publishedAt) data.datePublished = post.publishedAt;
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

/**
 * The bottle size, but only when the product has exactly one — with several sizes there
 * is no single answer, and naming one in a title or JSON-LD offer would be wrong.
 */
export function soleSizeLabel(p: Pick<ProductDTO, 'sizes'>): string | undefined {
  return p.sizes.length === 1 ? p.sizes[0]!.label : undefined;
}

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
  const size = soleSizeLabel(p);
  if (size) data.size = size;
  if (p.rating.count > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: p.rating.avg,
      reviewCount: p.rating.count,
    };
  }
  return JSON.stringify(data).replace(/</g, '\\u003c');
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
      // Size + concentration in the title: the long-tail queries are "55ml perfume", not bare names.
      const qualifier = [soleSizeLabel(dto), dto.concentration !== 'Other' ? dto.concentration : undefined]
        .filter(Boolean)
        .join(' ');
      return {
        title: dto.seo.title ?? [dto.name, qualifier || undefined, BRAND].filter(Boolean).join(' — '),
        description: dto.seo.description ?? dto.shortDesc,
        canonicalPath: canonical,
        image: toAbsoluteImageUrl(dto.images[0]),
        jsonLd: productJsonLd(dto, canonical),
      };
    }
  }

  const blog = clean.match(/^\/blog\/([^/]+)$/);
  if (blog) {
    const slug = blog[1]!;
    const doc = await BlogPost.findOne({ slug, isPublished: true }).lean();
    if (doc) {
      const canonical = `/blog/${slug}`;
      return {
        title: doc.seo?.title ?? `${doc.title} — ${BRAND}`,
        description: doc.seo?.description ?? doc.excerpt,
        canonicalPath: canonical,
        image: toAbsoluteImageUrl(doc.coverImage),
        jsonLd: articleJsonLd(
          { title: doc.title, excerpt: doc.excerpt, coverImage: doc.coverImage, publishedAt: doc.publishedAt ? new Date(doc.publishedAt).toISOString() : undefined },
          canonical,
        ),
      };
    }
  }

  const stat = STATIC_META[clean];
  if (stat) return { ...stat, canonicalPath: clean };
  return { title: `${BRAND} — Luxury in every drop`, description: DEFAULT_DESC, canonicalPath: clean };
}

export function buildHeadTags(meta: RouteMeta, origin = ''): string {
  const url = `${origin}${meta.canonicalPath}`;
  const safeUrl = escapeHtml(url);
  const desc = escapeHtml(meta.description);
  const title = escapeHtml(meta.title);
  const parts = [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<link rel="canonical" href="${safeUrl}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:url" content="${safeUrl}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ];
  if (meta.image) parts.push(`<meta property="og:image" content="${escapeHtml(meta.image)}" />`);
  if (meta.jsonLd) parts.push(`<script type="application/ld+json">${meta.jsonLd}</script>`);
  return parts.join('\n    ');
}

export function buildSitemap(origin: string, products: { slug: string; type: string }[], blogSlugs: string[] = []): string {
  const staticPaths = ['/', '/products', '/bundles', '/blog', '/about', '/contact'];
  const urls = [
    ...staticPaths.map((p) => `${origin}${p}`),
    ...products.map((p) => `${origin}/${p.type === 'bundle' ? 'bundles' : 'products'}/${p.slug}`),
    ...blogSlugs.map((s) => `${origin}/blog/${s}`),
  ];
  const body = urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export const ROBOTS_TXT = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Sitemap: /sitemap.xml', ''].join('\n');
