# 17 — Roadmap

Phase 1 builds **everything** in the spec. Milestones below are build order, not scope cuts.

## Milestone 0 — Foundations
- Monorepo (npm workspaces), TS config, lint/format, Tailwind + tokens + themes.
- `packages/shared` types + Zod schemas. Env validation. DB connection. Seed script.
- App shells (storefront + admin layouts), router, theme + dark mode, design primitives.

## Milestone 1 — Catalog & content (read)
- Product + ScentFamily models, admin products CRUD, image upload.
- Storefront: Home, Products (search/filter/sort), Product detail, Bundles.
- Cloudinary image pipeline. SEO meta injection + JSON-LD + sitemap/robots.

## Milestone 2 — Commerce
- Cart (local + account merge), Checkout (COD) → order + WhatsApp link → confirmation.
- Orders: customer view + admin management (status lifecycle).
- Auth (register/login/logout), account area, wishlist.

## Milestone 3 — Engagement
- Ratings & reviews (+ admin moderation, rating recompute).
- Find Your Scent quiz (config + flow + recommendations).
- Offer banners (scheduling). Blog (CRUD + index/post + SEO).

## Milestone 4 — Polish & ship
- Animations pass (perf-safe). Accessibility audit. Performance pass (Lighthouse ≥ 90).
- Tests (unit/integration/E2E smoke). Deployment (VPS + Nginx + PM2). Search Console.

## Post-launch (future, out of phase-1 scope)
- Online payments (Paymob/Stripe). Email notifications. Discount codes/promotions.
- Inventory alerts. Analytics. Loyalty. Multi-language/Arabic + RTL. Multi-currency.
