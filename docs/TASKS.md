# HERENCIA — Master Task Tracker

> Source of truth for **done / current / todo**. Kept in sync with the live session task
> list and `docs/memory/current-state.md`. Update at every checkpoint.

Legend: `[x]` done · `[~]` in progress · `[ ]` todo

_Last updated: 2026-07-01 (Milestone 3 complete)_

---

## Phase 0 — Planning
- [x] Brainstorm scope & lock decisions
- [x] Write master spec (`docs/superpowers/specs/2026-06-29-herencia-design.md`)
- [x] Write docs scaffolding (00–17 + memory + this file)
- [x] Spec self-review
- [x] User reviews spec (approved 2026-06-29)
- [x] Implementation plan — Milestone 0 (`docs/superpowers/plans/2026-06-29-milestone-0-foundations.md`)
- [ ] Implementation plans for Milestones 1–4 (written just-in-time per milestone)

## Milestone 0 — Foundations
- [x] Monorepo + npm workspaces + root scripts
- [x] TS configs, ESLint, Prettier
- [x] Tailwind + brand tokens + light/dark themes
- [x] `packages/shared`: types + Zod schemas + enums/constants
- [x] api: env validation, Mongo connection wiring, error handler, base middleware
- [x] Seed script — delivered in Milestone 1 (Task 4)
- [x] App primitives: theme toggle (ThemeProvider) + Button
- [x] App shells: storefront + admin layouts + router — delivered in Milestone 1 (Task 7/11)

## Milestone 1 — Catalog & content
- [x] Product + ScentFamily models
- [x] Admin products/bundles CRUD + Cloudinary upload
- [x] Storefront Home
- [x] Products list (search/filter/sort)
- [x] Product detail (gallery, notes, sizes, related)
- [x] Bundles list/detail
- [x] SEO: meta injection + JSON-LD + sitemap + robots

## Milestone 2 — Commerce
- [x] Cart (local + account merge)
- [x] Checkout (COD) → order + WhatsApp link → confirmation
- [x] Orders: customer view
- [x] Orders: admin management (status lifecycle)
- [x] Auth (register/login/logout) + guards
- [x] Account area + wishlist

## Milestone 3 — Engagement
- [x] Ratings & reviews + admin moderation
- [x] Find Your Scent quiz (config + flow + recommendations)
- [x] Offer banners (scheduling)
- [x] Blog (CRUD + index/post + SEO)

## Milestone 4 — Polish (code) — branch `feat/milestone-4-polish`
- [x] Dark-mode/theming: semantic feedback tokens app-wide (T1, T2, T2b)
- [x] Correctness: review dup-409, admin→public cache invalidation, blog markdown (T3–T5)
- [x] Accessibility: cart focus trap, form labels, control aria-labels, stable keys (T6, T7)
- [x] Animations pass (perf-safe): motion foundation + reveals + micro-interactions + cart/route motion (T8–T10)
- [x] Performance: self-host fonts, responsive images + LCP preload, CSP, static prerender (T11–T14)
- [x] Rate-limiting (auth/orders/reviews) (T15)
- [x] Tests: closed deferred Vitest gaps (T16); Playwright E2E smoke authored (T17)
- [~] E2E run: infra + specs committed; **run blocked on env** — built `node dist/server.js` fails under plain Node ESM (see deploy note)

## Pre-launch gap fixes (round 37, 2026-07-29) — UNCOMMITTED
- [x] Admin catalog endpoint so deactivating a product doesn't hide it from admin (+ pagination, no 48 cap)
- [x] Guest order tracking: `POST /api/orders/track` + `/track` page (footer, confirmation, fallback links)
- [x] Discount codes one-per-phone (welcome code = first order only) + removable applied code at checkout
- [x] Admin order editing (delivery details) + delete blocked unless cancelled
- [x] Owner-triggered release of stale unpaid InstaPay orders (restores stock)
- [x] Account order detail (items, address, progress, receipt)
- [x] Guest orders link to accounts on register / login / profile save
- [x] Low-stock ntfy alert + server-side stock counts on the dashboard
- [x] Debounced product search; Returns contact email from settings; footer socials only when configured
- [ ] **Password reset (customer + admin)** — still missing; an owner lockout needs DB access to fix
- [ ] Set `instapay.handle` in Admin → Home (confirmation step 1 currently names no destination)

## Launch prep (round 38, 2026-08-14)
- [x] Reset production data for launch (`npm run reset-launch -w apps/api`, dry-run by default)
- [x] Products relabelled 50ml → 55ml, surfaced on card / PDP / SEO title / JSON-LD
- [x] Per-route SEO on the split Vercel deploy (`/api/seo/prerender` + `bake-seo.mjs`) — closes the round-28 gap
- [x] `sitemap.xml` + `robots.txt` served from the web domain, not just the API domain
- [x] InstaPay handle + business pay link set; email-popup mojibake fixed
- [x] `www.herencia-eg.com` added to the Vercel web project
- [ ] **Meta Pixel + Conversions API** — deferred by user; blocked on the portfolio decision (#60)

## Analytics (round 39, 2026-08-14) — spec `2026-08-14-analytics-design.md`
- [x] **Phase 1 — capture**: Event/Session models (90-day TTL), `POST /api/events`, `Order.attribution`, server-side purchase events, client tracker, storefront wiring
- [x] **Phase 2 — dashboard**: `DailyStat` lazy rollups, `/admin/analytics`, funnel with drop-off, revenue vs previous period, traffic sources, phone-keyed cohorts + LTV

## Conversion funnels (round 41, 2026-08-14)
- [x] Remove the unbacked sample-credit promise (defaults, admin placeholders, live settings)
- [x] Back-in-stock waitlist: notify-me on the PDP + owner waitlist on Admin → Inventory
- [ ] Abandoned-checkout follow-up (owner-driven WhatsApp)
- [ ] Post-purchase review request (store currently has zero reviews)
- [ ] `/bundles` is empty but still linked — user will add bundles

## Post-launch backlog (user asked for these; specs not yet written)
- [ ] Smart motion graphics
- [ ] On-page SEO content work (technical blocker now cleared)

## Milestone 5 (deferred) — Ops / Deploy (separate plan)
- [ ] **Fix built-server ESM** so `node apps/api/dist/server.js` runs on plain Node (NodeNext + `.js` imports, or esbuild bundle) — blocks E2E run + deploy
- [ ] Deployment (VPS + Nginx + PM2)
- [ ] Live Lighthouse ≥ 90 mobile verification (levers implemented in M4)
- [ ] Search Console + sitemap submitted
