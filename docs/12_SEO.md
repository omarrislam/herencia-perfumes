# 12 — SEO

Strategy: **Option A (SSR-lite)** — server injects correct `<head>` per route; static
pages prerendered; structured data for rich results.

## Per-route metadata (server-injected)
- `<title>`, `meta description`, canonical URL.
- Open Graph (`og:title/description/image/type/url`) + Twitter Card.
- Product pages pull title/description/image from the product (or `seo` overrides).
- Blog posts pull from post `seo`/excerpt/cover.

## Structured data (JSON-LD)
- **Product** + **Offer** (price EGP, availability) + **AggregateRating** (from reviews).
- **Article** for blog posts.
- **BreadcrumbList** on product/blog/category.
- **Organization** + logo sitewide.

## Crawlability
- Generated `sitemap.xml` (products, bundles, blog, static pages) + `robots.txt`.
- Clean, human-readable slugs. One canonical URL per resource.
- Prerendered HTML for static routes so crawlers get content without JS.
- Semantic HTML (`<main>`, `<nav>`, `<article>`, headings order).

## Client parity
- On client-side navigation, `lib/seo` updates the head to match server output so shared
  links and late-rendering crawlers stay consistent.

## Hygiene
- Unique titles/descriptions per page; no duplicate content.
- Image `alt` text everywhere. Descriptive link text.
- Fast load (see `13_PERFORMANCE.md`) — Core Web Vitals feed ranking.
- 404 returns proper status; no soft-404s.

## Verify
- Google Rich Results Test on a product + blog post.
- Lighthouse SEO ≥ 95. Sitemap submitted in Search Console.
