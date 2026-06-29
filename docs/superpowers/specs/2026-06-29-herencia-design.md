# HERENCIA — Design Spec

> Master design document. Single source of truth. All `docs/00–17` files elaborate
> on sections here. If anything conflicts, this spec wins until updated.

- **Date:** 2026-06-29
- **Status:** Approved (brainstorming complete)
- **Owner:** Omar

---

## 1. Product Summary

HERENCIA is a premium, heritage-luxury **perfume brand e-commerce** web app. It is a
lightweight starter that must still feel rich and high-end. Launch catalog is 3–4
perfumes plus curated bundles. The site is **storefront + admin dashboard** in a single
React SPA, backed by a Node/Express API and MongoDB.

**Brand feel:** heritage, elegance, "Luxury in every drop." Crest/shield motif, gold +
deep maroon palette, Cinzel display type. Premium, tactile, calm — not flashy.

### Locked decisions (do not re-litigate)

| Decision | Choice |
|---|---|
| Language | **English only (LTR)**. No i18n/RTL. |
| Currency | **EGP** (market: Egypt). |
| Checkout | **COD + WhatsApp order capture**. No online payment gateway. |
| Catalog scope | **Perfumes + bundles**. |
| Rendering/SEO | **Option A — SSR-lite**: SPA + server-injected per-route meta + prerendered static pages. |
| Hosting | Single **VPS** (Node serves API + built web). MongoDB Atlas or self-hosted. |
| Auth | **JWT in httpOnly cookie**; roles `customer` / `admin`. |
| Images | **Cloudinary** (WebP/AVIF, responsive). Local-disk fallback allowed. |
| Animations | **Framer Motion** + CSS, lazy-loaded, `prefers-reduced-motion` honored. |
| Styling | **Tailwind CSS** with brand tokens. Radix/Headless UI for accessible primitives. |
| Dark mode | Yes, via `data-theme` + CSS custom properties. |
| Phase | **Build everything in phase 1** (incl. Find Your Scent quiz + Blog). |

---

## 2. Architecture

Monorepo via **npm workspaces** (no Turborepo/Nx — keep it light).

```
herencia/
├─ apps/
│  ├─ web/        # Vite + React + TS — storefront + admin SPA
│  └─ api/        # Node + Express + TS — REST API, serves web build, injects SEO meta
├─ packages/
│  └─ shared/     # Shared TS types + Zod schemas + constants
├─ docs/          # Specs, rules, memory, TASKS
└─ identity/      # Brand assets
```

- **Single deployable:** `api` serves the built `web` SPA and injects per-route SEO
  metadata (Option A). API routes live under `/api/*`; everything else returns the SPA
  shell with route-appropriate `<head>`.
- **Shared package** is the contract between front and back — types and Zod schemas are
  defined once and imported by both.
- **DB:** MongoDB + Mongoose. **Validation:** Zod at every API boundary.

Rendering strategy (Option A) detail:
- Static routes (`/`, `/products`, `/about`, `/contact`, `/bundles`) are **prerendered**
  to HTML at build time.
- Dynamic routes (`/products/:slug`, `/blog/:slug`) get **server-injected** `<title>`,
  meta description, Open Graph, and JSON-LD read from MongoDB at request time; body
  hydrates client-side.
- `sitemap.xml` and `robots.txt` generated server-side.

---

## 3. Data Model

See `docs/04_DATABASE.md` for full schemas. Collections:

- **Product** — perfume or bundle. Notes pyramid, sizes/prices, scent family, stock,
  rating aggregate, SEO fields, `bundleItems[]` for bundles.
- **ScentFamily / Category** — drives filters.
- **User** — customer/admin, addresses, wishlist.
- **Order** — COD orders, status lifecycle, customer + shipping snapshot.
- **Review** — 1–5 rating, moderated (`isApproved`).
- **Banner** — offer banners with scheduling.
- **BlogPost** — markdown body, tags, SEO.
- **QuizQuestion / QuizResult** — Find Your Scent quiz config + mapping to products.
- **Setting** — singleton: WhatsApp number, shipping fee, social links, hero content.

---

## 4. Pages & Routes

**Storefront:** `/`, `/products`, `/products/:slug`, `/bundles`, `/find-your-scent`,
`/cart`, `/checkout`, `/blog`, `/blog/:slug`, `/account`, `/login`, `/register`,
`/about`, `/contact`, 404.

**Features:** search, filters (scent family, gender, price, concentration), sort,
ratings & reviews, wishlist, offer banners, dark mode.

**Admin** (`/admin/*`, role-gated, lazy-loaded bundle): dashboard stats, products CRUD,
bundles, orders (status management), reviews moderation, banners, blog, quiz config,
site settings.

Checkout flow: cart → checkout form → create COD `Order` (status `pending`) → generate a
prefilled **WhatsApp link** to the brand number for confirmation → order confirmation page.

---

## 5. Design System

- **Palette:** maroon `#4B1D1D`, gold `#C29A5B`, cream `#F5EBC6`, parchment `#EBD6B1`;
  derived dark-mode surfaces (maroon-black) with gold accents.
- **Type:** **Cinzel** (display/headings) + **Jost** (body/UI, variable, refined
  geometric sans) — self-hosted, subset, `font-display: swap`.
- **Tokens:** CSS custom properties mapped into Tailwind config. Light/dark via
  `data-theme`.
- **Motifs:** shield/crest, gold hairline borders, parchment texture — used sparingly.

See `docs/09_DESIGN_SYSTEM.md`.

---

## 6. Animations

Framer Motion + CSS, lazy-loaded, gated by `prefers-reduced-motion`. Section reveals via
IntersectionObserver, card/button micro-interactions, logo gold shimmer, cart drawer.
**Hard rule:** transforms/opacity only (GPU), never animate in a way that delays LCP or
causes layout shift. See `docs/10_ANIMATIONS.md`.

---

## 7. SEO & Performance

- **SEO:** server-injected meta per route, JSON-LD (Product + AggregateRating, Article,
  BreadcrumbList), sitemap + robots, prerendered static pages, canonical URLs, semantic
  HTML.
- **Performance:** route-based code splitting, Cloudinary responsive WebP/AVIF, lazy
  images w/ blur placeholders, Tailwind purge, font preload/preconnect. Target
  **Lighthouse ≥ 90 mobile**. Mobile-first; mobile is the primary audience.

See `docs/12_SEO.md`, `docs/13_PERFORMANCE.md`.

---

## 8. Security

httpOnly JWT cookies, bcrypt, Zod validation, Helmet, rate-limiting (auth + orders),
CORS, role guards on admin routes, no secrets client-side. See `docs/14_SECURITY.md`.

---

## 9. Testing

Vitest (units + API), React Testing Library (key components), Playwright smoke flows
(browse → cart → checkout). Pragmatic coverage, not exhaustive. See `docs/15_TESTING.md`.

---

## 10. Deployment

Single VPS. `npm run build` → `api` serves everything. PM2 + Nginx reverse proxy. Env via
`.env`. MongoDB Atlas or self-hosted. CI: lint + test + build. See `docs/16_DEPLOYMENT.md`.

---

## 11. Out of Scope (phase 1)

- Online payment gateway (Paymob/Stripe) — roadmap item.
- Multi-language / Arabic / RTL.
- Multi-currency.
- Subscriptions, loyalty points, gift cards.
- Native mobile app.

---

## 12. Non-negotiable Principles

1. **Clean code, no overengineering.** YAGNI. Small, focused, single-purpose modules.
2. **Performance is a feature.** Every addition is weighed against LCP/bundle size.
3. **Brand fidelity.** Exact identity colors, fonts, crest. Premium feel throughout.
4. **Mobile-first.** Design and test mobile before desktop.
5. **State persistence.** Update `docs/memory/*` and `docs/TASKS.md` at every checkpoint.
