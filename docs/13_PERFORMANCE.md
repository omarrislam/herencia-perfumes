# 13 — Performance

Target: **Lighthouse ≥ 90 mobile** (Home + Product detail). Mobile-first audience.

## Budgets
- Initial JS (storefront, gzipped): keep lean; split routes; admin in its own chunk.
- LCP < 2.5s on mid-range mobile / throttled. CLS < 0.1. INP < 200ms.

## JavaScript
- Route-based code splitting; lazy-load admin, quiz, blog editor, heavy libs.
- Tree-shake; avoid large dependencies (prefer native/Intl, small utilities).
- Lazy-load Framer Motion usage; no animation lib on critical path.

## Images
- Cloudinary: auto format (WebP/AVIF), responsive `srcset`/`sizes`, quality auto.
- Lazy-load below-the-fold; blur/low-res placeholder; explicit dimensions (no CLS).
- Preload the LCP hero image.

## Fonts
- Self-host + subset (Latin). `font-display: swap`. Preload primary weights. Preconnect.

## CSS
- Tailwind purge → tiny CSS. Critical styles inlined where it helps first paint.

## Network / caching
- HTTP caching + immutable hashed assets. Gzip/Brotli at Nginx.
- Minimize API round-trips on first paint; cache GETs with React Query.

## Backend
- Indexed queries (see `04_DATABASE.md`). Paginate lists. Lean Mongoose queries.
- Denormalized `rating`/`basePrice` to avoid joins on list pages.

## Verify
- Lighthouse CI (or manual) on key routes each milestone. Bundle analyzer on web build.
