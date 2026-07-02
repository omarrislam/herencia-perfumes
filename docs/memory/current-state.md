# Current State

_Last updated: 2026-07-02_

## Phase
**Milestone 4 (Polish — code) COMPLETE & MERGED to `master` (merge commit `cbe8ba7`, feature branch deleted).** All 18 plan tasks (+ Task 2b theming sweep) done, each task spec+quality reviewed; final whole-branch review (opus) = Ready-to-merge-with-fixes → the one blocking fix (prerender serving / hydration) applied. **Next = Milestone 5 (Ops/Deploy).**
Full suite re-verified GREEN on merged `master`: `npm run lint` (0), `npm run typecheck` (0), tests — **shared 10 files/41, api 27 files/120, web 22 files/37** (`npm run build` clean incl. prerender of 5 shell routes + api build).

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
- Nothing — M4 code-polish complete and merged. Ready to start Milestone 5 (Ops/Deploy).

## Post-M4 follow-ups DONE (merged to master, 2026-07-02)
- ✅ **Premium design + motion uplift (full storefront sweep)** — new elevated foundation in `apps/web/src/styles/index.css` + `tailwind.config.ts` (depth tokens `bg-deep`/`surface2`/`ink`/`gold-hi`/`accent-strong`, warm tinted `shadow-lux*`, paper-grain `body::after`, type scale via `.display`/`.eyebrow`, reusable components `.card-lux`/`.btn-lux`/`.btn-outline`/`.field-lux`/`.rule-gold`/`.link-underline`). Applied across nav/footer, Button, ProductCard, Home (hero+values+quiz band), ProductDetail, Products/FilterBar, Bundles, Cart, Checkout, OrderConfirmation, Login/Register, NotFound, Blog/BlogPost, FindYourScent, ReviewsSection, Account, Gallery, BannerStrip. Brand kept (cream/maroon/gold, Cinzel/Jost). Reduced-motion honored; no CLS. ⚠️ NOTE: `tailwind.config.ts` changed → **dev server must be restarted** to pick up new tokens (Vite doesn't HMR tailwind config).
- ✅ **Bug fixes:** cart/drawer images now route through `cld()` (admin-uploaded Cloudinary images rendered inconsistently before); ProductForm fields now have visible labels (were `sr-only`); seed images switched to working picsum URLs + CSP allows them (were non-existent Cloudinary publicIds → broken); created gitignored `apps/web/.env` with `VITE_CLOUDINARY_CLOUD_NAME` so admin-uploaded images resolve.
- ✅ **Runnable built server (was the HIGH deploy blocker):** `node apps/api/dist/server.js` now runs on plain Node (v24) — server bundled with **esbuild** (npm deps external, `@herencia/shared` inlined from source) + `.env` loaded via Node's native `--env-file` in the `dev`/`start`/`seed` scripts. Verified end-to-end: boots, connects to Mongo, serves the prerendered storefront + API. (This also unblocks the Playwright E2E run.)
- ✅ **Batched M4 minors:** CartDrawer AnimatePresence keys + danger tokens; CartContext `justAdded` timer cleared on unmount; ProductImage blur-up only when a real Cloudinary URL; `app.set('trust proxy', 1)` in production (rate-limit keys on real client IP behind nginx); removed the hardcoded `PLAYWRIGHT_BROWSERS_PATH` from the Playwright config.

## Next (todo) — Milestone 5 (Ops/Deploy) — the last milestone
- Deployment (VPS + Nginx + PM2 — `npm ci && npm run build && npm run seed && pm2 start "npm run start -w apps/api"` shape); TLS; DNS.
- Run the Playwright E2E (`PLAYWRIGHT_BROWSERS_PATH=E:/ms-playwright npx playwright install chromium` once, then `npm run test:e2e`); now that the built server runs, the webServer can start.
- Live Lighthouse ≥ 90 mobile on Home + product. **Perf lever if < 90:** framer-motion is in the entry chunk (StorefrontLayout route cross-fade + cart drawer are eager) → entry ~114 kB gzip (was ~85). Lazy-load / drop the route cross-fade to move framer out of the entry.
- Search Console + sitemap submission.

## Remaining open minors (low priority; full list in the SDD ledger)
- `useFocusTrap` visibility filter doesn't exclude CSS-hidden focusables (documented in JSDoc; fine for CartDrawer; add getComputedStyle check before reuse).
- Playwright shop spec doesn't explicitly assert COD selection; prerender.tsx outside tsconfig (tsx/esbuild only) + `@jsxRuntime` pragma esbuild-specific.
- CSP `img-src` allows only self/Cloudinary → external `![](https://other-host)` blog images won't render (likely fine — content is Cloudinary-hosted).

## Machine health (still applies)
- **C: drive ~full.** api tests rely on the win32 mongod-temp redirect + injected test `JWT_SECRET` in `apps/api/vitest.config.ts`. Playwright browsers must install to `E:\ms-playwright`. Free C: + replace the redirect for CI/VPS. Machine Node is v24; project targets Node 20 (`.nvmrc`).
- Seed: `npm run seed --workspace apps/api`. Admin `admin@herencia.example` / `admin1234`.
