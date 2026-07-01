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

## Milestone 4 — Polish & ship
- [ ] Animations pass (perf-safe)
- [ ] Accessibility audit
- [ ] Performance pass (Lighthouse ≥ 90 mobile)
- [ ] Tests (unit/integration/E2E smoke)
- [ ] Deployment (VPS + Nginx + PM2)
- [ ] Search Console + sitemap submitted
