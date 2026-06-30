# Current State

_Last updated: 2026-06-30_

## Phase
**Milestone 1 (Catalog & Content) COMPLETE & MERGED to `master` (merge commit `423e763`, feature branch deleted). Next = Milestone 2 (commerce).**
Final whole-branch review (opus) passed "with fixes"; the 2 Important fixes (require adminToken; absolute og:image URL) applied in `ee97a1a`. Full suite green on merged master (64 tests: shared 15, api 35, web 14); lint/typecheck/build clean.

## Milestone 1 deliverables (branch `feat/milestone-1-catalog`)
- Shared: catalog Zod schemas + DTOs + `slugify` (Task 1).
- API: ScentFamily/Product/Setting/User models + in-memory test harness (T2,4); public catalog read API
  with filter/sort/pagination (T3); public `/api/settings` + Cloudinary signing + seed script (T4);
  interim `x-admin-token` admin guard + scent-family/product/bundle CRUD + upload signing (T5);
  SSR-lite SEO — request-time `<head>` injection + JSON-LD + sitemap.xml + robots.txt + SPA serving (T6).
  errorHandler maps CastError→400 and dup-key→409.
- Web: router + React Query + typed API client + SEO/cloudinary helpers (T7); catalog components + Home (T8);
  Products list with URL-driven filter/sort/pagination (T9); Product detail (gallery/notes/sizes/related)
  + Bundles (T10); admin UI — token gate, product CRUD, scent families, Cloudinary upload (T11).
- Verification (T12): full workspace green (lint/typecheck/test/build). API tests serialized + index-prebuilt
  for determinism; Windows mongod temp redirected off the full C: drive.
- SDD ledger: `.superpowers/sdd/progress.md` (Tasks 1–11 reviewed+fixed; minors triaged there).

## Done
- Explored prompt, suggested structure, and full brand identity.
- Locked all major decisions (see `decisions.md`).
- Wrote master spec: `docs/superpowers/specs/2026-06-29-herencia-design.md`.
- Wrote docs scaffolding `00`–`17`, `TASKS.md`, and memory files.
- **Task 1:** Root monorepo — npm workspaces, root scripts, TS base config, ESLint, Prettier.
- **Task 2:** `packages/shared` — types, Zod schemas (createOrderSchema / CreateOrderInput), enums/constants.
- **Task 3:** `apps/api` — env validation (loadEnv/Env), Mongoose connection, error handler, base middleware.
- **Task 4:** `apps/web` — Vite/React/Tailwind shell, brand tokens + CSS custom properties, light/dark ThemeProvider, Button primitive, app shell skeleton.
- **Task 5:** Full-workspace cleanup (brand fonts, React lint rules, cross-platform dev script, test isolation); lint/typecheck/test/build all green.

## In progress
- Nothing — Milestones 0 and 1 complete and merged to `master`. Ready to start Milestone 2.

## Next (todo)
- **Milestone 2 (Commerce).** Write the M2 plan via writing-plans, then execute via
  subagent-driven-development on `feat/milestone-2-commerce`. See `next-session.md` for the full M2 scope:
  cart (local + account merge), COD checkout + WhatsApp link, customer + admin orders, **real JWT httpOnly-cookie
  auth + roles replacing the interim `requireAdmin` internals** (same seam), account + wishlist.
- Fold in early (cheap M1 final-review carry-overs): type-filter `/products/:slug/related` [F-min-5];
  ProductCard compareAt/basePrice size pairing [F-min-4]. Full deferred list at the bottom of the SDD ledger.

## Resolved open items
- Body font: **Cinzel (display) + Jost (body/UI)** — now loaded in index.html.
- Images: **Cloudinary** (confirmed).
- Hosting: single VPS.
- Spec approved by user.

## Notes
- Git initialized; Milestone 0 implemented via subagent-driven development (Tasks 1–5),
  final whole-branch review (opus) passed with fixes applied, then **merged to `master`**
  (merge commit `572a2ed`); feature branch deleted. Working tree clean, full suite green.
- Seed script and full router/layouts deferred to Milestone 1 (per 17_ROADMAP.md).
- No git remote yet — when ready to push/PR, add a GitHub remote first.
- Final-review fixes in `f198369`: shared builds before typecheck/test; tests excluded from
  emitted dist; 500s logged. Deferred minors (theme FOUC, lint config files, Button cosmetic,
  shared `"*"` pin) tracked for the Milestone 4 polish pass.
