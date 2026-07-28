# HERENCIA

> Premium heritage perfume house — *"Luxury in every drop."*

A production e-commerce storefront and full admin CMS for the HERENCIA fragrance brand
in Egypt. Built mobile-first, dark-mode native, and optimised for a market where checkout
happens over cash-on-delivery and WhatsApp rather than a card gateway.

**Live:** [herencia-eg.com](https://herencia-eg.com) · API: `herencia-api-pi.vercel.app`

---

## What it is

A TypeScript monorepo with three workspaces:

| Workspace | What it does |
| --- | --- |
| `apps/web` | Vite + React SPA — the storefront *and* the admin dashboard |
| `apps/api` | Express + MongoDB REST API; also serves the built web app and SEO routes |
| `packages/shared` | Types, enums and Zod schemas used by both sides — one source of truth for every payload |

Every request body is validated against a shared Zod schema, and **prices are always
recomputed server-side** — the client's numbers are never trusted.

## Features

### Storefront
- **Catalog** of perfumes and bundles with search, filters, sorting and pagination
- **Product detail** with a fragrance-notes pyramid (346 illustrated note icons, alias
  resolution so `cedarwood` → `cedar`), size selection, stock state, ratings and reviews
- **Samples-first funnel** — per-perfume 5ml sample stock, all copy CMS-editable, sample
  value credited toward a full bottle
- **"Find Your Scent" quiz** — weighted answers tally to a scent family + gender profile
  and recommend live catalog products
- **Cart + checkout** — COD or InstaPay, Egyptian phone validation and normalisation,
  27-governorate picker, saved-address autofill, free-shipping progress, discount codes
- **Order confirmation** with a printable branded receipt (PDF via print), WhatsApp
  hand-off for InstaPay proof-of-payment
- **Accounts** (JWT in an httpOnly cookie), wishlist, order history, blog, testimonials
  from real approved reviews, email-capture discount banner
- Dark mode, English/LTR, EGP throughout

### Admin (`/admin`)
A complete CMS — the owner never needs a developer to change the site:

Dashboard with real revenue/order analytics and best-sellers · Products (incl. notes
editor and per-perfume sample stock) · Inventory by SKU × size with low-stock badges ·
Orders (search, pagination, status timeline, aging badges, expandable detail, print,
CSV export, InstaPay mark-as-paid) · Customers · Subscribers · Discount codes · Reviews
moderation · Scent families · Banners · Blog · Quiz · Home-page content and section
ordering.

### Operations
- **Owner push alerts** on every new order via [ntfy.sh](https://ntfy.sh) — free, no
  account, taps through to the admin orders page
- **Customer WhatsApp messages** — the admin order panel generates pre-filled `wa.me`
  receipt and status-update links that the owner sends from the store's own number
  (see [`docs/18_WHATSAPP_NOTIFICATIONS.md`](docs/18_WHATSAPP_NOTIFICATIONS.md) for why
  the official Cloud API path is dormant)
- Cloudinary image pipeline with responsive transforms and blur-up placeholders
- `sitemap.xml` / `robots.txt` and per-route SEO metadata served by the API

## Tech stack

**Frontend** — Vite · React 18 · TypeScript (strict) · Tailwind CSS · TanStack Query ·
React Hook Form · Framer Motion · React Router
**Backend** — Node · Express · Mongoose/MongoDB · Zod · JWT · Helmet · rate limiting · bcrypt
**Testing** — Vitest, Testing Library, Supertest, `mongodb-memory-server`, Playwright (E2E)
**Infra** — Cloudinary (images) · Vercel (current) · VPS + Nginx + PM2 (target)

## Repo layout

```
apps/
  web/            storefront + admin SPA
    src/pages/      routes (incl. pages/admin)
    src/features/   domain logic: auth, cart, products, admin
    src/components/ shared UI
    scripts/        bake-hero.mjs, preload-home.mjs (post-build HTML optimisation)
  api/
    src/routes/     REST endpoints (public + /api/admin)
    src/models/     Mongoose schemas
    src/modules/    cart / order / review services
    src/lib/        cloudinary, jwt, seo, ntfy, whatsapp, serialize
packages/shared/  types, enums, Zod schemas (the contract between web and api)
docs/             specs, architecture, design system, runbooks, session memory
identity/         brand assets
```

## Getting started

**Prerequisites:** Node ≥ 20, and a MongoDB instance (local or Atlas).

```bash
npm ci
cp .env.example .env      # then fill it in (see below)
npm run seed --workspace apps/api
npm run dev               # web on :5173 (proxies /api to :4000), api on :4000
```

Admin sign-in after seeding: `admin@herencia.example` / `admin1234` — change it before
exposing anything publicly.

### Environment

Root `.env`, validated at boot by a Zod schema (`apps/api/src/config/env.ts`) — the API
refuses to start on a bad config rather than failing later.

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | ✅ | Connection string |
| `JWT_SECRET` | ✅ | ≥ 16 characters |
| `CLIENT_ORIGIN` | ✅ | URL, or comma-separated list — the **first** is canonical for SEO |
| `PORT` / `NODE_ENV` | | Default `4000` / `development` |
| `CLOUDINARY_*` | | `CLOUD_NAME`, `API_KEY`, `API_SECRET` — image uploads |
| `WHATSAPP_NUMBER` | | Store number behind the storefront WhatsApp links |
| `NTFY_TOPIC` / `NTFY_SERVER` | | Owner order alerts; disabled when the topic is unset |
| `WA_PHONE_NUMBER_ID` / `WA_ACCESS_TOKEN` / `WA_TEMPLATE_LANG` | | WhatsApp Cloud API — currently dormant |

The web app additionally reads `VITE_API_URL` and `VITE_CLOUDINARY_CLOUD_NAME` when the
frontend is deployed separately from the API.

### Production build, run locally

```bash
npm run build
npm run start --workspace apps/api    # single server on :4000, serves web + API
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | API + web with hot reload |
| `npm run build` | Build shared → web → api |
| `npm test` | Unit/integration suites across all workspaces |
| `npm run test:e2e` | Playwright end-to-end |
| `npm run typecheck` | `tsc --noEmit` everywhere |
| `npm run lint` / `npm run format` | ESLint / Prettier |
| `npm run seed --workspace apps/api` | Seed families, catalog, settings, admin user |

## Testing

Vitest across all three workspaces — the API suite runs against an in-memory MongoDB, so
no external services are needed. Playwright covers the buy flow end-to-end.

```bash
npm test                                    # all workspaces
npm run test --workspace apps/api           # API only
```

## Deployment

**Current (Vercel)** — two projects from this one monorepo: `herencia` (static Vite build,
root `apps/web`) and `herencia-api` (Express wrapped as a serverless function, root
`apps/api`). Full setup, including the cross-origin `SameSite=None` auth cookie and the
known caveats, is in [`docs/DEPLOY_VERCEL.md`](docs/DEPLOY_VERCEL.md).

```bash
vercel --prod                               # web
# api deploys from the repo root with VERCEL_ORG_ID / VERCEL_PROJECT_ID overridden
```

> After changing the hero image in Admin, redeploy the web project — the hero is baked
> into `index.html` at build time so first-time visitors get it without waiting on JS.

**Target** — a single VPS running one Node process behind Nginx + PM2, which restores
request-time SEO injection for every route. See [`docs/16_DEPLOYMENT.md`](docs/16_DEPLOYMENT.md).

## Engineering notes

A few decisions worth knowing before changing things:

- **Shared schemas are the contract.** Add a field in `packages/shared` first; web and API
  both compile against it.
- **Performance is budgeted.** Entry bundle is kept lean (Framer Motion and Zod are
  lazy-loaded), the hero preload is baked into the HTML, and the Home route's modules are
  injected as `modulepreload` links after the Vite build. Animations use transforms and
  opacity only, and honour `prefers-reduced-motion`.
- **Locked product decisions** (English only, EGP, COD + WhatsApp with no card gateway,
  Cloudinary, JWT httpOnly cookie) are recorded with rationale in
  [`docs/memory/decisions.md`](docs/memory/decisions.md) — read it before re-opening one.
- Session state and current status live in [`docs/memory/current-state.md`](docs/memory/current-state.md).

## Documentation

Numbered guides in [`docs/`](docs/) cover the project in depth — requirements,
architecture, database, API, frontend/backend conventions, design system, animations,
admin, SEO, performance, security, testing, deployment and roadmap. The master spec is
`docs/superpowers/specs/2026-06-29-herencia-design.md`, which wins on conflict.

---

Private project. All brand assets in `identity/` are property of HERENCIA.
