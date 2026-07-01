# Current State

_Last updated: 2026-07-01_

## Phase
**Milestone 3 (Engagement) COMPLETE & MERGED to `master` (merge commit `a270e80`, feature branch deleted). Next = Milestone 4 (Polish & ship).**
Final whole-branch review (opus) = READY TO MERGE (no Critical/Important); tests re-verified green on merged `master`. Full workspace green: `npm run lint` (0), `npm run typecheck` (0), `npm run build` (clean), `npm run test` — **shared 10 files, api 26 files (~105 tests), web 17 files (27 tests)** all passing.

## Milestone 3 deliverables (branch `feat/milestone-3-engagement`)
- **Shared:** review/banner/blog/quiz Zod schemas + DTOs; `BANNER_PLACEMENT` (Tasks 1–2). Barrel fixed to re-export banner symbols without duplicate `export *`.
- **API — Reviews (T3):** `Review` model (compound unique `{product,user}`), `recomputeProductRating` (approved-only, 1-dp), public GET(approved)/POST(auth, 409 dup), admin GET/PUT/DELETE moderation (recompute on change).
- **API — Quiz (T4):** `QuizQuestion` model; public GET (labels only — **weights server-only**) + POST result (server-side recommend + fallback); admin CRUD (weights).
- **API — Banners (T5):** `Banner` model; public GET by placement within schedule window; admin CRUD.
- **API — Blog (T6–T7):** `BlogPost` model; public published-only list/detail; admin CRUD (auto-slug, publishedAt on first publish); blog SEO — Article JSON-LD + per-post `<head>` + sitemap slugs via the M1 `routeMetaForPath`/`buildSitemap` seam.
- **Web:** ReviewsSection + AdminReviews (T8); FindYourScent + AdminQuiz (T9); BannerStrip (Home/global) + AdminBanners (T10); Blog + BlogPost + AdminBlog (T11); nav/routes into StorefrontLayout + AdminApp.
- **Seed (T12):** demo banners, a published blog post, quiz questions weighted to seeded families, approved reviews (+ rating recompute).
- **SDD ledger:** `.superpowers/sdd/progress.md` — Tasks 1–12 reviewed; 3 Important fixes applied (Task 3 recovery, Task 9 nested-AuthProvider, Task 10 banner timezone/CTA); 2 pre-merge fixes (review stars, banner CTA scheme guard); Minors triaged by the final review.

## Done
- Milestones 0 + 1 + 2 complete and merged to `master` (M2 merge `ed6036e`).
- Milestone 3 built via subagent-driven development (Tasks 1–12), each task spec+quality reviewed, final whole-branch review (opus) = READY TO MERGE.

## In progress
- Nothing — Milestone 3 complete and merged to `master`. Ready to start Milestone 4.

## Next (todo)
- **Milestone 4 (Polish & ship):** animations pass (perf-safe), accessibility audit, performance pass (Lighthouse ≥ 90 mobile), broader tests/E2E smoke, deployment (VPS + Nginx + PM2), Search Console + sitemap submission. Plus the batched M3 deferred-minors (below). Same workflow: writing-plans → review → subagent-driven-development on `feat/milestone-4-polish`.

## Resolved open items
- Reviews/quiz/banners/blog all implemented and green; security properties (quiz weight isolation, review rating integrity, draft/schedule leak prevention, blog-body XSS-safety) verified end-to-end by the final review.

## Notes
- ⚠️ **C: drive still ~full** — MongoMemoryServer api tests rely on the win32 temp redirect to E: + injected test `JWT_SECRET` in `apps/api/vitest.config.ts`. Free up C: and replace the redirect for CI/VPS.
- **M3 deferred minors** (from the final review — mostly M4 polish/a11y): raw-palette status badges break dark mode (AdminReviews/AdminBanners/AdminBlog — batch into a semantic status-token cleanup); AdminQuiz answer-remove button lacks aria-label + non-form buttons lack `type="button"`; admin mutations don't invalidate the public `['banners',placement]` query (cross-tab staleness); ReviewsSection/AdminReviews/AdminBlog delete errors show generic strings; `key={idx}` in a few lists; a markdown renderer for the blog body; a few test-hardening gaps (adminBanners inactive-visibility, seo real-draft fallback, `<`-escape assertion). New-min: review concurrent double-submit surfaces E11000→500 instead of 409 (map duplicate-key on reviews). Full per-item list at the bottom of the SDD ledger.
- Seed (`npm run seed --workspace apps/api`) now also creates banners, a blog post, quiz questions, and approved reviews. Admin `admin@herencia.example` / `admin1234`.
