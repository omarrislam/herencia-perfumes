# Current State

_Last updated: 2026-07-07_

## Post-M4 round 12 (homepage trim + payment highlight + admin order details/delete + hero preload fix, on master, 2026-07-07)
- ✅ **3-Steps copy trimmed** to one scannable line each ("Pick up to 5 scents · 2ml each" / "Test them on your skin, at home" / "Full sample value credited to your bottle"); photos + titles kept.
- ✅ **Essence + Atelier/craft MERGED** into one image-led split (essence.webp + headline "Composed by hand. Matured for months. Bottled in small batches."). **`craft` section key REMOVED** from shared (`REORDERABLE_SECTIONS`, `homeSectionsSchema`, defaults), Setting model, serialize, AdminHome — stored sectionOrders self-heal (normalizeSectionOrder drops unknown keys; verified live). apothecary.webp now unused on Home.
- ✅ **Gifting band trimmed** to headline + Shop bundles button only.
- ✅ **Checkout payment choice highlighted** — selected COD/InstaPay card gets border-2 border-success + bg-success-soft + green ✓ badge (both states Playwright-verified).
- ✅ **Admin Orders: click row → expanded details** (customer, address, payment, items, subtotal/shipping/discount/total, notes) + **Delete order** (confirm dialog → `DELETE /api/admin/orders/:id`, 204; does NOT restore stock — same semantics as cancel). Status `<select>` stops row-toggle propagation.
- ✅ **Hero LCP fix (root cause of "hero still slow")** — hero rendered via ProductImage srcset [400/800/1200] while the preload fetched w=1600 → preload wasted + late second download. Hero is now a plain `<img>` with the EXACT preloaded URL (`cld(id,{w:1600})`) + `fetchpriority=high`; splash hold cut 1100ms → 400ms. Verified: rendered src === preload href, ~330 KB f_auto/q_auto transfer.
- ✅ Verified: typecheck/lint 0; tests **shared 41 / api 135 (+2 delete-order) / web 38 (+1 expand/delete)**; Playwright QA of home sections, checkout both payment states, admin expand + real delete (removed the leftover "QA Tester" order HRC-MRAR9HI3-THJX from the shared DB).
- Uncommitted on master — user hasn't asked to commit.

## Post-M4 round 11 (note icons + receipt, deployed, 2026-07-07)
- ✅ **Real fragrance-note icons** — 48 static webp images in `apps/web/public/notes/` (sourced from parfinity's Shopify CDN); `lib/noteLibrary.ts` (slug + alias resolution, e.g. frankincense→incense, cedarwood→cedar). **NoteIcon** model + public `GET /api/notes` + admin `POST/DELETE /api/admin/notes` (upsert by name) for custom uploads. NotesPyramid tiles resolve custom→builtin→initial fallback.
- ✅ **Admin notes editor** in ProductForm — per-tier chips with icons, type-ahead datalist (library + customs), Enter/Add, and an inline "New note icon" uploader (name + image → Cloudinary → NoteIcon upsert).
- ✅ **Receipt download** — OrderConfirmation "Download receipt (PDF)" → `window.print()`; print-only `#receipt` portal (branded, itemized, discount-aware) + print CSS hides `#root`/grain. Verified as an actual PDF via Playwright page.pdf().
- ✅ api tests +3 (noteIcons), web ProductDetail test mock covers /api/notes. All suites green (shared 41 / api 133 / web 37).
- NOTE: the user replaced the catalog in the shared DB (amber-noir, cedar-smoke, heritage-trio… royal-oud is gone) — QA scripts must fetch a live slug. More QA orders exist in Orders (pending badge).

## Post-M4 round 10 (instant hero + lighter light palette, deployed, 2026-07-07)
- ✅ **Instant hero** — `lib/heroCache.ts` caches the hero (content + resolved image URL) in `localStorage['herencia.hero']` on every settings load; `main.tsx` preloads the cached image before React mounts; Home renders the cached hero immediately (fresh settings replace it silently — same image, no swap). First-ever visit still holds the espresso base briefly (no SSR on Vercel static hosting). Verified by delaying /api/settings 5s — hero rendered instantly from cache.
- ✅ **Lighter light-mode palette** — `--bg` #f2e9d1 (was #e6d7ae), `--bg-deep` #e8dcbb, `--surface` #fefcf5, `--surface-2` #f5eeda. Dark theme unchanged.
- Deployed to production (web project only; API unchanged). Production DB is SHARED with local dev (same MONGODB_URI) — admin edits locally appear live.
- Deploy notes: Vercel CLI installed + authed (`omarrislam`); projects `herencia` (root .vercel → herencia-one.vercel.app, rootDir apps/web) and `herencia-api` (apps/api/.vercel → herencia-api-pi.vercel.app, rootDir apps/api → must deploy **from repo root** with VERCEL_ORG_ID/VERCEL_PROJECT_ID env override).

## Post-M4 round 9 (conversion polish, on master, 2026-07-07)
- ✅ **Maroon primary CTAs** — theme-tuned `--cta`/`--cta-hover` vars (light #4b1d1d, dark #5e2626) + Tailwind `cta`/`cta-hover`; applied to `.btn-lux`, Button primary, ProductCard add-to-cart, SampleModal footer, CartDrawer checkout. **Lighter light-mode surfaces** (`--surface` #fdf8ec, `--surface-2` #f6ecd3) for card separation.
- ✅ **Free-shipping progress bar** in CartDrawer footer ("Add EGP X more…" gold bar → green "✓ unlocked") from `settings.freeShippingThreshold`.
- ✅ **Email popup → non-blocking floating banner** (cookie-style): fixed bottom card (bottom-right on desktop, full-width bottom on mobile), no backdrop/scroll-lock, page stays interactive; same delay/dismissal/subscribe/code logic (`EmailPopup.tsx` rewritten).
- ✅ **Parfinity-style fragrance notes** on product detail — `NotesPyramid` rewritten: Top/Heart/Base groups, square tiles (Cinzel initial + name). **Admin ProductForm now edits notes** (comma-separated Top/Heart/Base inputs — notes previously had NO admin UI at all).
- ✅ Verified: typecheck/lint 0, web 22 files/37 tests green (api/shared untouched); Playwright QA desktop+mobile (banner non-blocking scroll confirmed, drawer progress both states, notes on royal-oud, mobile checkout).
- ⚠️ tailwind.config.ts changed → restart dev server to pick up `cta` tokens.
- Git: no remote configured — commits are local; ask the user for a remote URL to push.

## Post-M4 round 8 (sales-first UX overhaul, on master, 2026-07-07) — decisions #37–40
- ✅ **Hero flash fixed** — hero image/text gated on settings load (espresso placeholder, same height, no CLS); swirl preload removed from index.html. Swirl is fallback-only now.
- ✅ **Sales-first home order** — `featured` under hero, then `samples` (ThreeSteps is now a reorderable CMS section, 11 section keys). Stored orders without `'samples'` serve the new default until admin re-saves (serialize normalization).
- ✅ **Email discount popup end-to-end** — `settings.emailPopup` (Admin → Home card), `Subscriber` model, rate-limited idempotent `POST /api/newsletter`, storefront popup (5s delay, 7-day re-dismiss, suppressed on cart/checkout/confirmation/admin), code → `localStorage['herencia.discountCode']` → auto-applied at checkout; `createOrder` validates the code server-side and persists `discount`/`discountCode` (Order model + DTO). **NOTE: QA enabled it in the dev DB with code WELCOME10 / 10% — edit in Admin → Home.**
- ✅ **Sample flow reworked** — per-unit "Perfume Sample" product (`ensureSampleBox` migrates the old 5×2ml box on boot; 2ml @ 60 EGP default, price editable in **Admin → Products**). Card CTA "Order a sample"; modal preselects clicked product with green ✓ (success tokens), visible gold + buttons, per-sample price + running total, adds qty = picked count; cart drawer/page list picked sample names.
- ✅ **Checkout compact 2-col** (form + sticky summary), address line 2 removed, discount row + manual "Have a discount code?", payment cards only (no InstaPay dropdown/QR at checkout).
- ✅ **Confirmation** — COD: confirmed + "4–5 business days", WhatsApp optional (no required confirm). InstaPay: pay-link button from `settings.instapay.payLink` (new field, Admin → Home; QR upload UI removed) + screenshot-on-WhatsApp step. WhatsApp order message now says InstaPay when applicable.
- ✅ Verified: lint 0, typecheck 0, tests **shared 41 / api 130 (+7 new: newsletter ×3, discount ×2, settings ×2) / web 37**; Playwright visual QA of the full buy flow (popup→subscribe→samples→checkout→COD confirmation), light+dark+mobile.
- ⚠️ QA left one test order in the dev DB ("QA Tester", COD, WELCOME10) and a subscriber `qa-test@herencia.example`; Royal Oud 50ml stock −1, samples −2. Cancel/ignore in Admin → Orders.

## Post-M4 round 7 (dashboard, inventory, promo bar editable, full-width time, on master, 2026-07-02)
- ✅ **Admin Dashboard** (`AdminDashboard.tsx`, index route) — stat cards (orders, pending, revenue from recent orders, products, low/out-of-stock) + recent-orders list. **Admin Inventory** (`AdminInventory.tsx`) — SKU × size stock table sorted low-first with Low/Out badges + summary. Both in sidebar nav + routes.
- ✅ **Promo bar is now settings-driven** (`settings.promoBar {enabled,text,ctaText,ctaLink}`) and **editable in Admin → Home** (was a global_top Banner). Renders as a **black bar above the navbar**. StorefrontLayout no longer uses BannerStrip for it.
- ✅ **Time section full-bleed** with the hourglass brand photo `public/time.png`; text overlaid left.
- ✅ **Testimonials** restyled parfinity-style: rating trust line (4.9 ★) + avatar-initial cards.
- ✅ **Cards** more compact; Home featured drawer min-w 52%; Products/Bundles 4-up on lg.
- Note: Dashboard revenue sums the fetched recent-orders page; Inventory is a read-only overview (edit stock via Products).

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

## Post-M4 round 6 (promo bar, new sections, cards, sidebar admin, on master, 2026-07-02)
- ✅ **Promo banner moved ABOVE the navbar** (rendered inside the header, above nav; header is fixed on home / sticky elsewhere). Managed in **Admin → Banners** (placement `global_top`), NOT Admin Home.
- ✅ **New home sections:** `time` ("Time as an Ingredient — Patience is our rarest material", uses the user's saying) + `testimonials` (3 curated quotes). Wired into the CMS (10 section keys now; toggle + reorder).
- ✅ **Cards** — square image (shorter/wider), 3-up grids on desktop (Home featured shows 3), smaller mobile drawer (min-w 60%, square) — fixes "huge mobile cards".
- ✅ **Admin restructured** into a left-sidebar dashboard (brand header, vertical nav w/ pending-orders badge, card-based content, View store / Sign out). Couldn't read the Stitch prototype (JS app) — built a clean dashboard; will match Stitch if screenshots are provided.
- Verified home (desktop+mobile) + admin (logged-in) via Playwright.
- Testimonials are currently static curated quotes (not admin-editable yet).

## Post-M4 round 5 (editorial homepage redesign + brand imagery, on master, 2026-07-02)
- ✅ **Homepage redesigned** (user disliked the old one). New editorial sections using the `identity/` brand photography (copied to `apps/web/public/`: essence.png, giftbox.png, apothecary.png, hero-swirl.png): **essence** split, **gifting** band (maroon box → bundles), **atelier/craft** split, **FAQ** accordion — plus featured (add-to-cart cards) + values + quiz. Hero falls back to the gold-maroon swirl when no Cloudinary hero is set. Kept fonts (Cinzel/Jost) + footer + nav.
- ✅ **Section CMS expanded** to the new keys (essence/featured/gifting/craft/values/quiz/faq) — still toggle + reorder in Admin → Home. (`promo`/home_hero banner no longer rendered on home.)
- ✅ Verified desktop + mobile, light + dark via Playwright (mobile now stacks cleanly — the "awful" layout is fixed).
- **parfinity applied:** FAQ section + gifting/curated band. **NOT done (optional, need your go-ahead):** sample/"test before buy" path (real commerce feature — new sample SKUs), brand/press wall (N/A — single brand), customer-testimonial wall.
- Stitch prototype couldn't be extracted (JS app); used identity screens + parfinity + judgment instead.
- Nav legibility: transparent hero nav is legible now (dark hero + top scrim); if a bright hero is uploaded, add a text-shadow.

## Post-M4 round 4 (contrast, cards, reorder, notifications, on master, 2026-07-02)
- ✅ **Contrast overhaul** — deeper light bg + lighter dark surfaces + stronger borders/shadows so cards/sections separate; verified light+dark via Playwright.
- ✅ **Add-to-cart + concentration badge on product cards** (parfinity-inspired). **Nav legibility** hero top-scrim.
- ✅ **Product image "doesn't take effect"** — ProductForm now has image thumbnails with ✕ remove + ★ make-main (was append-only, images[0] never changed).
- ✅ **Reorderable home sections** — `sectionOrder` in settings (schema/model/DTO+normalize); Admin Home has ▲▼ to reorder values/featured/promo/quiz (hero fixed first); Home renders in order.
- ✅ **In-app notifications** — admin: pending-orders badge on Orders nav (polls 60s). Customer: "Updated" badge on account orders whose status changed since last visit (localStorage).
- ✅ **Resilient Mongo connect** — server.ts retries 6×/3s (transient Atlas SRV DNS `ECONNREFUSED` via Cisco Umbrella no longer crashes boot). Permanent option: non-SRV connection string in .env.
- Playwright chromium at `E:\ms-playwright`; screenshot QA via temp scripts (removed).
- ⏭ Possible next (from parfinity): sample/test path, curated-box discount, brand/press wall, homepage FAQ. Also: dark-mode QA of product-detail/cart/checkout pages.

## Post-M4 round 3 (bug-fixes + InstaPay + visual QA, on master, 2026-07-02)
- ✅ **"Save does nothing" fixed** — queryClient had `staleTime 60s` + `refetchOnWindowFocus:false`; switched to `refetchOnWindowFocus:true` + 15s so admin edits appear on the storefront tab.
- ✅ **Dark-mode invisible sections fixed** — root cause: `--ink` token FLIPS to cream in dark mode, but was used as an always-dark surface (quiz band, `.btn-lux`, hero/banner overlays, cart badge) → cream-on-cream. Added a FIXED `espresso` (#241111) token for those. Verified via Playwright screenshots (light+dark, desktop+mobile).
- ✅ **InstaPay at checkout (feature #2) DONE** — `paymentMethod` (cod|instapay) end-to-end; checkout shows COD/InstaPay choice (QR from `settings.instapay.qrImage` or `/instapay-qr.jpg` fallback + handle) when enabled in admin Home; confirmation shows transfer+WhatsApp-screenshot. **NOTE: must enable InstaPay in Admin → Home to see it at checkout.**
- ✅ **Transparent hero nav** (hero starts under the navbar; nav turns solid on scroll); **mobile products drawer** (featured = horizontal swipe on mobile); **transparent logo** (`identity/transparent-logo.png` → `public/logo.png`); announcement bar moved below the hero on home.
- ✅ **Disabled build-time prerender** — it caused React #419 hydration errors + theme flicker; SEO meta still server-injected. (Revises decision #34.)
- ✅ **Playwright** chromium installed to `E:\ms-playwright`; used for screenshot QA (`shots.mjs` was a temp script, removed).
- ⏭ **STILL TODO:** (a) **reorder home sections up/down** in Admin Home (currently toggle-only); (b) **in-app notifications #3** (admin new-order indicator + customer status-change on account); (c) elevate home further (ongoing); (d) visual QA of product/cart/checkout pages in dark mode (home verified; espresso fix should carry).

## Post-M4 round 2 (UI/UX + Home CMS, on master, 2026-07-02)
- ✅ **Mobile nav** — added a real hamburger menu (nav links were `hidden md:flex` with NO mobile menu before). **Logo** (`identity/logo.jpeg` → `apps/web/public/logo.jpeg`) in navbar + footer (white-bg JPEG → shows as a light badge in dark mode; a transparent PNG would be cleaner). **Free-shipping bar** → full-width centered announcement bar (was a left pill). **Home full-bleed** (edge-to-edge hero + full-width bars; content in a container).
- ✅ **Home CMS (feature #1 of 3) — DONE end-to-end.** New editable Settings: `homeSections` toggles + `instapay` on the model; shared `updateSettingsSchema`/`SettingDTO`; partial-safe `PUT /admin/settings` (requireAdmin); `GET /settings` exposes them. Admin **Home** page (`/admin/home`): edit hero (title/subtitle/CTA/**image upload**) + show/hide each section (hero/values/featured/promo/quiz) + InstaPay settings (enabled/handle/QR upload). Storefront Home respects the toggles. **Hero image now persists** via upload→save. api 28f/123 green.
- ⏭ **NEXT (per user):** #2 InstaPay AT CHECKOUT (payment-method choice COD|InstaPay → show QR+handle+instructions, transfer + WhatsApp screenshot; store paymentMethod on Order) — settings foundation done, checkout flow NOT built yet. Then #3 in-app notifications (admin new-order indicator + customer status-change on account).
- ⚠️ Could NOT visually verify (no browser-automation tools in this env) — user to check light/dark + mobile on the running site and report.

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
