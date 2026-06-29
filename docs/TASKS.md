# HERENCIA — Master Task Tracker

> Source of truth for **done / current / todo**. Kept in sync with the live session task
> list and `docs/memory/current-state.md`. Update at every checkpoint.

Legend: `[x]` done · `[~]` in progress · `[ ]` todo

_Last updated: 2026-06-29_

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
- [x] api: env validation, Mongo connection, error handler, base middleware
- [x] Seed script
- [x] App shells: storefront + admin layouts, router, theme toggle, UI primitives

## Milestone 1 — Catalog & content
- [ ] Product + ScentFamily models
- [ ] Admin products/bundles CRUD + Cloudinary upload
- [ ] Storefront Home
- [ ] Products list (search/filter/sort)
- [ ] Product detail (gallery, notes, sizes, related)
- [ ] Bundles list/detail
- [ ] SEO: meta injection + JSON-LD + sitemap + robots

## Milestone 2 — Commerce
- [ ] Cart (local + account merge)
- [ ] Checkout (COD) → order + WhatsApp link → confirmation
- [ ] Orders: customer view
- [ ] Orders: admin management (status lifecycle)
- [ ] Auth (register/login/logout) + guards
- [ ] Account area + wishlist

## Milestone 3 — Engagement
- [ ] Ratings & reviews + admin moderation
- [ ] Find Your Scent quiz (config + flow + recommendations)
- [ ] Offer banners (scheduling)
- [ ] Blog (CRUD + index/post + SEO)

## Milestone 4 — Polish & ship
- [ ] Animations pass (perf-safe)
- [ ] Accessibility audit
- [ ] Performance pass (Lighthouse ≥ 90 mobile)
- [ ] Tests (unit/integration/E2E smoke)
- [ ] Deployment (VPS + Nginx + PM2)
- [ ] Search Console + sitemap submitted
