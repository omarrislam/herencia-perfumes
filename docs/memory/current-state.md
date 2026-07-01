# Current State

_Last updated: 2026-07-02_

## Phase
**Milestone 4 (Polish — code) implemented on branch `feat/milestone-4-polish` (NOT yet merged).** All 18 plan tasks (+ Task 2b theming sweep) complete and task-reviewed. Final whole-branch review + merge pending.
Full suite GREEN on the branch: `npm run lint` (0), `npm run typecheck` (0), `npm run build` (clean, incl. prerender of 5 shell routes + api build), tests — **shared 10 files/41, api 27 files/118, web 22 files/37**.

## Milestone 4 deliverables (branch `feat/milestone-4-polish`)
- **Theming (T1/T2/T2b):** semantic feedback tokens `success/warning/danger/info` (+ `-soft`) as theme-aware CSS vars → Tailwind; ALL raw-palette feedback colors replaced app-wide (grep clean). Order-status badge map tokenized.
- **Correctness (T3–T5):** friendly 409 on review duplicate-key race + single agg local; admin banner/blog/review mutations invalidate public caches (`['banners']`/`['blog']`/`['reviews']`) + surface `ApiError` on delete/moderate; blog body now real markdown (`marked`→`DOMPurify`, XSS-safe).
- **A11y (T6/T7):** `useFocusTrap` (focus-in + trap + restore) on CartDrawer; visible `<label>`s on Login/Register; AdminOrders per-row `<select>` aria-label; AdminQuiz remove-answer aria-label + `type=button` + stable answer keys (uuid).
- **Animations (T8–T10):** `lib/motion.ts` + `useReducedMotion` + `Reveal` (framer-motion, reduced-motion-safe); section reveals (hero excluded for LCP), button press + card hover (motion-reduce guards), logo shimmer, cart-drawer slide/backdrop (AnimatePresence, focus trap preserved), add-to-cart pulse (`justAdded`), route cross-fade. Transforms/opacity only, no CLS.
- **Performance (T11–T14):** self-hosted Cinzel/Jost via `@fontsource` (dropped Google Fonts); `cldBlur` responsive images + blur-up + hero LCP `<link rel=preload>`; real Helmet CSP (resolves F-min-3); build-time static prerender of 5 shell routes + client `hydrateRoot` (router→shared `routes[]` + BrowserRouter+useRoutes; StorefrontLayout inner Suspense).
- **Security (T15):** `express-rate-limit` on auth/order/review POSTs (skip in test); resolves decision #30.
- **Tests (T16/T17):** closed deferred Vitest gaps (M3-min-6/7/8, M2-min-6/8/9/17), all +10 tests genuine; Playwright E2E infra + smoke specs (shop + admin) authored (root `test:e2e`, browsers→E:). Vitest config excludes `e2e/**`.
- **Decisions #31–36** logged; SDD ledger `.superpowers/sdd/progress.md` has per-task commits/reviews.

## Done
- Milestones 0 + 1 + 2 + 3 complete and merged to `master`.
- Milestone 4 code-polish built via subagent-driven development (18 tasks + 2b), each task spec+quality reviewed; Critical/Important fixed inline.

## In progress
- **Final whole-branch review (opus) + `finishing-a-development-branch` (merge to `master`)** — the only remaining step for M4 code-polish.

## Next (todo) — deferred to a separate Ops/Deploy plan (Milestone 5)
- ⚠️ **DEPLOY BLOCKER (HIGH):** built `node apps/api/dist/server.js` fails under plain Node ESM — `ERR_MODULE_NOT_FOUND` on extensionless relative imports (tsconfig `moduleResolution: Bundler`). The server only ran via `tsx` in dev. Fix before deploy: apps/api → `NodeNext` + `.js` on relative imports, OR an esbuild bundle for the server, OR run via tsx in prod. This also **blocks the Playwright E2E run** (webServer can't start the built server).
- Deployment (VPS + Nginx + PM2); live Lighthouse ≥ 90 mobile verification; Search Console + sitemap submission.

## Notes / open minors (for the final review to triage — full list in the SDD ledger)
- **Perf lever:** framer-motion is in the entry chunk (StorefrontLayout route cross-fade + cart drawer are eager) → entry ~114 kB gzip (was ~85 kB). If mobile Lighthouse < 90, lazy-load the route cross-fade / drop it.
- CartDrawer: no explicit `key` on the two AnimatePresence `motion.div`s; `addItem` setTimeout not cleared on unmount (dev warning only).
- ProductImage blur `backgroundImage` is invalid CSS when `VITE_CLOUDINARY_CLOUD_NAME` unset (dev/test only; prod has cloud).
- Playwright: dead/machine-specific `PLAYWRIGHT_BROWSERS_PATH:'E:/ms-playwright'` in webServer.env; COD not explicitly asserted.
- `useFocusTrap` visibility filter doesn't exclude CSS-hidden focusables (documented in JSDoc; fine for CartDrawer; add getComputedStyle check before reuse).
- prerender.tsx outside tsconfig (tsx/esbuild only); `@jsxRuntime` pragma is esbuild-specific.

## Machine health (still applies)
- **C: drive ~full.** api tests rely on the win32 mongod-temp redirect + injected test `JWT_SECRET` in `apps/api/vitest.config.ts`. Playwright browsers must install to `E:\ms-playwright`. Free C: + replace the redirect for CI/VPS. Machine Node is v24; project targets Node 20 (`.nvmrc`).
- Seed: `npm run seed --workspace apps/api`. Admin `admin@herencia.example` / `admin1234`.
