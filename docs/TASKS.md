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

## Milestone 5 (deferred) — Ops / Deploy (separate plan)
- [ ] **Fix built-server ESM** so `node apps/api/dist/server.js` runs on plain Node (NodeNext + `.js` imports, or esbuild bundle) — blocks E2E run + deploy
- [ ] Deployment (VPS + Nginx + PM2)
- [ ] Live Lighthouse ≥ 90 mobile verification (levers implemented in M4)
- [ ] Search Console + sitemap submitted
