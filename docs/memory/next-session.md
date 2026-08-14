# Next Session — START HERE

_Last updated: 2026-08-14_

## NEW (2026-08-14, round 42): FUNNELS pt.2 — verified-buyer reviews shipped
Detail in current-state round 42. Deployed + live-verified. Suites shared 74 / api 322 / web 118.
- 🚨 **Customers literally could not review** (requireAuth + guest-checkout norm = zero possible reviewers). Fixed with `POST /api/products/:slug/reviews/verified` — order number + phone as proof, no account. One 404 for both "no order" and "wrong phone" so order numbers can't be probed. First name only is ever published.
- ⚠️ **`Review` indexes are now partial** (`{product,user}` and `{product,orderNumber}`, each `$exists`-guarded). **Production indexes were synced by hand.** If the Review schema's indexes change again, run `Review.syncIndexes()` against prod — mongodb-memory-server rebuilds indexes every run, so an index bug passes every test and fails only in production.
- ✅ Admin → Orders: **"Ask for a review"** on delivered orders only.

### ⏭ REMAINING BACKLOG
1. **Funnels pt.3** — abandoned-checkout follow-up (the last funnel item; needs contact capture as the customer types, privacy-sensitive).
2. **Motion graphics** — not started. Transforms/opacity only, `prefers-reduced-motion`, no CLS, Lighthouse ≥ 90. **Round-36: never wrap horizontal-carousel items in a scroll-reveal.**
3. **On-page SEO content** — technical blocker cleared round 38; content untouched.
4. **Meta Pixel + CAPI** — deferred (decision #60), blocked on the portfolio choice.

### ⚠️ Still open
- **`/bundles` empty but still linked** in nav + footer (user's choice — "I'll add bundles soon").
- No password reset for customers OR admin.
- VASCO 55ml stock read **11** after round-42 cleanup; consistent with the user cancelling their InstaPay order (+1) and the test order netting to zero. Worth an eyeball against the real shelf.


## NEW (2026-08-14, round 41): FUNNELS pt.1 — unbacked promise removed, back-in-stock waitlist shipped
Detail in current-state round 41. Committed `7f7648d`, deployed, live-verified. Suites shared 74 / api 312 / web 113.
- 🚨 **The samples copy promised the sample price back against a bottle in three places with no mechanism at all.** User chose to REMOVE the promise rather than build the credit. `settings.ts` carries a comment: do not reintroduce a credit claim without a redemption mechanism.
- ✅ **Back-in-stock**: `POST /api/products/:slug/notify` + PDP form + waitlist on Admin → Inventory (restocked rows highlight, wa.me per person, mark-contacted).

### ⏭ REMAINING BACKLOG
1. **Funnels pt.2** — abandoned-checkout follow-up (needs contact capture as the customer types, privacy-sensitive) and post-purchase review request (store has **zero reviews** — no social proof anywhere). Both fit the owner-taps-WhatsApp pattern.
2. **Motion graphics** — not started. Transforms/opacity only, respect `prefers-reduced-motion`, no CLS, Lighthouse ≥ 90. **Round-36 lesson: never wrap horizontal-carousel items in a scroll-reveal.**
3. **On-page SEO content** — technical blocker cleared in round 38; content untouched.
4. **Meta Pixel + CAPI** — deferred (decision #60), blocked on the portfolio choice.

### ⚠️ Still open
- **`/bundles` is empty but still linked** in nav + footer — the user chose to keep it ("I'll add bundles soon"). Every click is a dead end until a bundle exists.
- `HRC-MSSV644S-IJQS` (InstaPay pending, 560 EGP) placed by the user — unpaid InstaPay holds stock.
- No password reset for customers OR admin.


## NEW (2026-08-14, round 40): ANALYTICS PHASE 2 (dashboard) SHIPPED — analytics is COMPLETE
`/admin/analytics` is live: range selector, revenue vs previous period, drop-off funnel, traffic sources, phone-keyed cohorts. Decisions **#66–68**, detail in current-state round 40. Suites shared 74 / api 292 / web 105.
**✅ Live-verified in production** (Playwright login + screenshot). Three issues found and fixed: a 23.6s first 90-day load (backfill looped day-by-day → now one batched `rollupRange` pass, 1.4s cold), a funnel that read as broken when orders exceed tracked checkouts (now explained in-panel), and a chart with no value labels (now labels peak + latest).
**Lesson repeated for the third round running: the bug was only visible by exercising the real thing.** Screenshot the page and time the endpoint; tests will not surface latency or "this looks broken".

### Lessons from round 40
- **Vitest fake timers + mongoose = silent data loss in tests.** Fake timers replace the global `Date`; mongoose casts with `instanceof Date`, so any document written under fake timers stores its date fields as raw NUMBERS and no date-range query matches. Seed relative to the real current day instead. `rollup.test.ts` carries a warning comment.
- **Run the dataviz palette validator; don't eyeball.** The obvious accent-vs-muted pairing failed the normal-vision floor (ΔE 11.4 < 15) — two warm browns. `--chart-2` is a validated slate instead.

### ⏭ REMAINING BACKLOG (user asked for all of these)
1. **Conversion funnels / engagement flows** — now measurable, which is why it was sequenced after analytics. Not started.
2. **Smart motion graphics** — not started. Constraints: transforms/opacity only, respect `prefers-reduced-motion`, no CLS, Lighthouse ≥ 90. **Round-36 lesson: never wrap horizontal-carousel items in a scroll-reveal.**
3. **On-page SEO content** — the technical blocker was cleared in round 38; the content work is untouched.
4. **Meta Pixel + CAPI** — deferred by the user (decision #60); blocked on which Meta portfolio to use.

### ⚠️ Still open
- `HRC-MSSV644S-IJQS` (Omar Islam, VASCO 55ml, 560 EGP, **InstaPay pending**) placed by the user 2026-08-14 11:28. Unpaid InstaPay holds stock — use the decision-54 stale-unpaid sweep if it was only a test.
- No password reset for customers OR admin — an owner lockout still needs DB access.
- `/bundles` is empty but linked in nav + footer.


## NEW (2026-08-14, round 39): ANALYTICS PHASE 1 (capture) SHIPPED — dashboard is next
Spec `specs/2026-08-14-analytics-design.md`, plan `plans/2026-08-14-analytics-capture.md`. Decisions **#62–65**. Detail in current-state round 39.
**Live now**: `Event` + `Session` (90-day TTL), `POST /api/events`, `Order.attribution` stamped at creation, server-side purchase events, client tracker + `usePageTracking`. Verified end-to-end on production (UTM landing → product_view → add_to_cart → attributed order). Suites shared 74 / api 256 / web 90.

### ⏭ NEXT: Analytics Phase 2 (dashboard) — design already written, needs its own plan
From the spec: `DailyStat` **lazy rollups** (no cron, per decision #54 — the stats endpoint rolls up missing past days on request, today computed live, recompute must be idempotent), `/admin/analytics` with date range + compare-to-previous, funnel with drop-off, revenue chart, sources table (sessions from `DailyStat.bySource`, orders/revenue from `Order.attribution`), phone-keyed cohorts + LTV. **Hand-rolled SVG charts** — no charting library (Lighthouse budget); use the `dataviz` skill.

### ⚠️ Hard-won lessons from round 39 — do not relearn these
- **`sendBeacon` sends `text/plain`.** The server parses it. **Never "fix" this by sending an `application/json` Blob** — it works in dev (same-origin proxy) and breaks in production (cross-origin, not CORS-safelisted, beacons can't preflight).
- **Unit tests passed through all three real bugs.** Baked HTML must be inspected as bytes; the hydrated DOM and the network layer need a real browser. Browse the actual site before believing a tracking feature works.
- **Order matters in `flush()`**: `getSessionId()` is what captures the landing UTMs, so it must run before they are read. Getting this wrong silently empties the most valuable field, permanently (`$setOnInsert`).
- **Analytics writes inside `createOrder` must be individually caught** — an uncaught throw reaches the stock `rollback` and restores stock for an order that already exists.

### ⚠️ Open item
`HRC-MSSV644S-IJQS` (Omar Islam, VASCO 55ml, 560 EGP, **InstaPay pending**) was placed by the user 2026-08-14 11:28 and left untouched. Unpaid InstaPay holds stock — use the decision-54 stale-unpaid sweep if it was only a test.

## NEW (2026-08-14, round 38): LAUNCH PREP shipped — data reset, 55ml, per-route SEO
Decisions **#57–61**, detail in current-state round 38.
- **Production data was reset**: 36 orders, 5 carts, 3 subscribers, 7 `@example.com` accounts deleted via the new `npm run reset-launch -w apps/api` (dry-run by default, `--yes-wipe-production` to apply). Catalog/settings/content/admin untouched; the user's 2 accounts kept.
- **Products are 55ml now** (were `50ml`), surfaced on card / PDP / SEO title / JSON-LD. `ProductDetail` used to hide the size entirely for single-size products.
- **Per-route SEO works at last** — the round-28 gap is closed. `GET /api/seo/prerender` + `bake-seo.mjs`. ⚠️ **Deploy api BEFORE web** — the web build fetches that endpoint. ⚠️ Adding a product/post needs a web redeploy for its meta.
- **InstaPay now points at the business handle** `herencia@instapay` / `ipn.eg/S/herencia/instapay/25bWuF` (was the user's personal link).
- **`www.herencia-eg.com` now serves** (round-37 open item closed). Both apex and www return 200.
- **Shipped**: `a6cb8b9` + `fc80aca` + `2a1ca65`, pushed to origin/master, api + web both deployed and live-verified. Suites shared 67 / api 224 / web 74.
- ⚠️ **Two self-inflicted bugs caught only by live verification, not by tests** — worth remembering as a pattern: baked HTML needs to be inspected as bytes, and the hydrated DOM needs a real browser. (1) duplicate canonicals from re-reading a template the loop had already rewritten; (2) `useSeo` overwriting the baked title on hydration. Details in current-state round 38.

### ⭐ THE REAL BACKLOG — user asked for all of this; only launch blockers were built
The original request decomposed into 8 workstreams. **These 4 are unbuilt and each needs its own spec → plan → implement cycle:**
1. **Conversion funnels** — keeping users engaged. Not started.
2. **Smart motion graphics** — not started.
3. **Shopify-grade analytics dashboard** — user picked ALL four pillars: conversion funnel (sessions → views → ATC → checkout → orders with drop-off), revenue over time + period comparison, traffic sources / UTM attribution, customer cohorts + LTV. **Needs first-party event capture + UTM storage on orders — a real build, not a dashboard skin.**
4. **On-page SEO content** to actually rank — the *technical* blocker is now fixed, the content work isn't.
5. **Meta Pixel + CAPI** — deferred by the user (decision #60). Blocked on which Meta portfolio to use; ships inert until a Pixel ID exists.

### ⚠️ Machine gotcha (will bite again)
This box's system DNS resolver times out on the TXT lookup `mongodb+srv://` needs → `queryTxt ETIMEOUT` on ANY script hitting the prod DB. Google DNS resolves it fine. Workaround: a throwaway wrapper that calls `dns.setServers(['8.8.8.8','1.1.1.1'])` then imports the real script. Deliberately not committed.

## NEW (2026-07-29, round 37): PRE-LAUNCH GAP AUDIT — 12 fixes. **SHIPPED 2026-07-30** (`f170deb`, pushed, api + web deployed, live-verified)
Audit of the purchase + admin flows before launch; user picked 12 items. Decisions **#50–56**, detail in current-state round 37.
**Worst bug found:** admin screens listed products through the PUBLIC catalog (`isActive: true`), so deactivating a product hid it from the only UI that could re-enable it. New `GET /api/admin/products` fixes it and retires the 48-item cap.
Also shipped: `/track` guest order lookup (order no. + phone), discounts one-per-phone (+ a **Remove** control at checkout — the applied state used to hide the input), admin order editing, delete blocked unless cancelled, owner-triggered stale-unpaid InstaPay sweep, account order detail, guest→account order linking, low-stock ntfy alerts, debounced search, Returns contact email, footer socials.
Suites: shared 60 / api 201 / web 70, typecheck + lint + build clean.
**Deploy gotcha:** deploying the api via the `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` override prints a misleading `herencia-…` URL that looks like the web project — verify by probing the api domain, not the printed URL.
**Still open from the audit (user didn't take these):** no password reset for customers OR the admin (an owner lockout currently needs DB/seed access — worth doing before launch); `instapay.handle` unset in prod; **`www.herencia-eg.com` doesn't serve** (DNS resolves, host not added to the Vercel project — apex is fine); flat 60 EGP shipping nationwide; no minimum order; sold-out Perla Rosa still featured with no notify-me; /bundles empty but linked in nav + footer.

## NEW (2026-07-29, round 36): featured products were **invisible**, not slow. `Reveal` (framer `whileInView`) gated each featured card on IntersectionObserver, which tests BOTH axes — carousel cards parked off-screen to the right never intersected and sat at opacity 0 forever (auto-advance is off below 768px, so mobile never recovered). Featured cards now use mount-based `.anim-fade-up` CSS; `animation-delay` zeroed in the reduced-motion rule. Regression test `Home.featured.test.tsx` (IntersectionObserver stubbed to never fire). Committed `e118f4c`, pushed, web deployed, live-verified at 390px. **⚠️ Lesson: never wrap items of a horizontal carousel in a scroll-reveal — use a mount-based animation.** Details: current-state round 36.
**Still open (offered, user didn't take it):** featured cards enter the DOM at ~2562ms on throttled mobile — JS execution (framer-motion + Home chunk), not data (API resolves at 1657ms, 3.5 kB). Real fix is the M5 prerender/SSR item.

## NEW (2026-07-17, round 35): WhatsApp customer notifications = **wa.me links, NOT the Cloud API**. ⛔ Meta portfolio `1401383105229630` is PERMANENTLY restricted ("including app sharing", review returned final) → Cloud API can never be provisioned. **Do not re-attempt the Meta dashboard setup, and do not rebuild under the clean portfolio `1647810982950230`** (= circumvention, risks it + the personal account). Built `apps/web/src/features/admin/whatsappMessage.ts` + 6 tests; Admin → Orders expanded panel has **WhatsApp receipt** / **WhatsApp "<status>" update** links (owner taps send). `waCloud.ts` kept but permanently dormant. web tsc clean, 10/10 green. **SHIPPED 2026-07-28: committed `3a59271`, pushed to origin/master, web deployed + live-verified on herencia-eg.com.** README rewritten in the same round (`49d9d1c`). Details: current-state round 35, decisions #48–49, docs/18.

## NEW (2026-07-15, round 32): SAMPLES REDESIGN shipped — per-perfume sampleStock + CMS samples copy. Merged `d7f1d22` (branch deleted), deployed api+web, prod migrated (legacy sample-box product DELETED; amber-noir/cedar-smoke sampleStock=50), live E2E + browser verified. Rounds 16–31 were committed as `c199be5` beforehand. Suites: shared 54 / api 169 / web 48. Full detail in round 32 of current-state.md; SDD ledger has the task-by-task record + accepted minors. **Git is CLEAN now (only at.mjs + instapay-qr untracked).**

## GIT REMOTE (2026-07-15): `origin` = https://github.com/omarrislam/herencia-perfumes.git — full history (183 commits) pushed, `master` tracks `origin/master`. Verified NO secrets in tree or history (.env always gitignored; .env.example is placeholders only). `at.mjs` + `identity/instapay-qr.png.jpeg` intentionally NOT pushed. Push works via Windows Git Credential Manager. **Commit/push only when the user asks** (per CLAUDE.md).

## NEW (2026-07-12, round 27): ntfy owner purchase alerts, DEPLOYED api, UNCOMMITTED
Push notification to the owner's phone via ntfy.sh on every new order (`apps/api/src/lib/ntfy.ts`, wired into `createOrder`). **Two real production bugs found+fixed after the first deploy sent zero notifications** — full root-cause writeup in round 27 of current-state.md: (1) header-based ntfy API rejected the em-dash title (Fetch header values must be ByteString/Latin-1) → switched to ntfy's JSON publish API; (2) `NTFY_TOPIC` on Vercel had a trailing `\n` from `echo | vercel env add` → re-set via `printf '%s' | vercel env add`. Verified end-to-end against live production (real order → real ntfy.sh poll confirms the exact message). `NTFY_TOPIC=herencia-orders-x2026` (clean) is set in local `.env` + Vercel `herencia-api` (Production+Development; Preview skipped, no connected Git repo). api suite 160 green, deployed twice + verified live. **Ask the user whether to commit this round** (rounds 20–26b are also still uncommitted from before).

## ⭐ Round-19 critique backlog — items 1–3 DONE in round 20 (deployed, uncommitted)
✅ Built: samples redesign, checkout ergonomics (phone hint / governorate select / WhatsApp links), floating WhatsApp+Instagram with smart hide. **Ask the user to commit round 20.**
Still parked from the critique: **P0 catalog content is the user's side** (real product photos — Cedar Smoke image is YSL-watermarked!, restock/hide sold-out bundle, fix stale Royal Oud testimonial). Code fixables remaining: section dead-air rhythm (~330px voids, divider doubles gap), sold-out card alignment + notify-me, PDP content thinness, reveal opacity-0 robustness (print/no-JS), no search/reorder, cart-drawer dim, admin-editable testimonials.

## NEW (2026-07-09, round 17): Performance + animations, DEPLOYED (still UNCOMMITTED, together with round 16 — ask user to commit!) — entry gzip 134.6→73.9 kB (framer/zod out of entry; CSS route-fade + mobile menu; lazy CartDrawer/SampleModal/EmailPopup; shared sideEffects:false), Home-route modulepreload injection (`preload-home.mjs`, needs `build.manifest`), ScentTrail hero animation (wisps + gold motes), hero scroll-away parallax, staggered reveals. **Live Lighthouse mobile 29 → ~56-61** (CLS 0.862→0.005 — root cause was Suspense fallback null painting the footer at top; logo.png 178→28.5 kB). **≥90 needs: home prerender/SSR retry (hydration #419 was why M4 reverted it), responsive hero srcset, real product images instead of picsum seeds.**

## NEW (2026-07-09, round 16): Fulfillment hardening, UNCOMMITTED — Egyptian phone validation (shared `egyptianPhoneSchema`, normalizes to 01X…), checkout per-field errors, receipt prints notes/samples + COLLECT/PAID banner (notes cap → 2000), InstaPay `paidAt` + mark-paid route/badges/guard, cancel restores stock (decision #45), `statusHistory` + admin Timeline + >24h waiting badges, admin orders search (`?q=`) + pagination UI. Suites: shared 46 / api 146 / web 45; QA'd in-browser. **User deferred the owner WhatsApp new-order alert until his Meta business number is ready** — implement in `createOrder` via `waCloud.ts` when he gives the go. Commit not yet requested.

## NEW (2026-07-08, round 15): InstaPay pay-to-confirm emphasis, checkout address autofill, marquee promo bar, 2×2 mobile trust strip, **official WhatsApp Cloud API notifications** (`lib/waCloud.ts`, env-gated — user must do Meta setup per `docs/18_WHATSAPP_NOTIFICATIONS.md` and set WA_PHONE_NUMBER_ID/WA_ACCESS_TOKEN). Rounds 14+15 committed together as `159d60a` + deployed to production (web + api; smoke-checked). Suggested homepage reorder (featured→values→samples→testimonials→essence→gifting→quiz→faq, time off) — still pending user decision.

## NEW (2026-07-08, round 14): Admin order printing (shared OrderReceipt), Shipping card in Admin → Home (fee + free threshold), samples uncapped/de-boxed (SAMPLE_PRODUCT rename, slug unchanged). WhatsApp research superseded by round 15 implementation.

## NEW (2026-07-08, round 13): first-visit hero fixed — `bake-hero.mjs` injects a hero preload + `window.__HERO__` into dist/index.html at build time (readHeroCache falls back to it); logo favicon added. Committed `597fe95`, web deployed. ⚠️ After changing the hero in Admin, redeploy the web project so first-time visitors get the new baked hero.

## NEW (2026-07-07, round 12): homepage trimmed (3-Steps one-liners, essence+craft merged — `craft` key removed app-wide, gifting headline-only), checkout payment cards get green selected state, Admin Orders rows expand to full details + Delete order (`DELETE /api/admin/orders/:id`), hero LCP fixed (hero `<img>` now uses the exact preloaded w=1600 URL + fetchpriority=high; splash 1100→400ms). Suites: shared 41 / api 135 / web 38. Committed `dabdcb5` on master + DEPLOYED to production (web + api).

## NEW (2026-07-07, round 9): maroon CTAs + lighter light surfaces, free-shipping progress bar in cart drawer, email popup is now a non-blocking floating bottom banner, parfinity-style notes tiles on product detail + notes editable in Admin → Products (ProductForm). No git remote yet — ask the user for one to push.

## NEW (2026-07-07): Post-M4 round 8 merged on master — sales-first UX
Hero-flash fix, featured+samples first on home, email-discount popup (server-validated `discountCode` on orders), per-unit sample product (price in Admin → Products), compact 2-col checkout (no line2, no InstaPay dropdown), COD auto-confirmed (4–5 days) / InstaPay pay-link (`settings.instapay.payLink`). Decisions #37–40. All suites green (41/130/37). Email popup was enabled in the dev DB (WELCOME10, 10%) — manage in Admin → Home. A QA test order + subscriber exist in the dev DB. Uncommitted — user hasn't asked to commit yet.

## TL;DR
Milestones 0–4 are all merged to `master` (M4 merge `cbe8ba7`), PLUS a post-M4 follow-up (merged 2026-07-02) that **made the built server runnable** (`node dist/server.js` via esbuild bundle + `--env-file`) and cleared the batched M4 minors. The app now RUNS end-to-end (verified: boots on Node 24, serves prerendered storefront + API). **Your job: Milestone 5 (Ops / Deploy)** — the last milestone. No git remote — add one only if the user asks to push/PR.

## How to RUN it locally (verified working)
- One-time seed (needs the root `.env` with MONGODB_URI etc.): `npm run seed --workspace apps/api`
- **Dev mode (hot reload):** `npm run dev` → web on http://localhost:5173 (proxies /api to :4000). Best for feature work.
- **Prod mode (single server, prerender + real serving):** `npm run build` then `npm run start --workspace apps/api` → whole site on http://localhost:4000.
- Admin: http://localhost:5173/admin (or :4000/admin) — `admin@herencia.example` / `admin1234`.

## Milestone 5 (Ops / Deploy) — NEW plan required (this is the last milestone)
- Deployment: VPS + Nginx + PM2 (`docs/16_DEPLOYMENT.md` + deploy runbook in the SDD ledger). Runtime = `npm ci && npm run build && npm run seed && npm run start -w apps/api` under PM2; nginx reverse-proxy + TLS. Env via PM2/systemd (or `--env-file`).
- Playwright E2E run (now unblocked): `PLAYWRIGHT_BROWSERS_PATH=E:/ms-playwright npx playwright install chromium` once, then `npm run test:e2e`.
- Live Lighthouse ≥ 90 mobile on Home + product. **Perf lever if < 90:** framer-motion is in the entry chunk (~114 kB gzip) — lazy-load / drop the StorefrontLayout route cross-fade to move framer out of the entry.
- Search Console + sitemap submission.

## Remaining low-priority minors (full list at bottom of SDD ledger)
- `useFocusTrap` filter excludes only `[hidden]`/disabled, not CSS-hidden (documented; fine for cart drawer).
- Playwright shop spec doesn't assert COD selection; prerender.tsx outside tsconfig + esbuild jsx pragma.
- CSP `img-src` blocks external (non-Cloudinary) blog images.
- `useFocusTrap`: add getComputedStyle visibility check before reusing in a modal with CSS-hidden content (documented).

## How to work (same as M0–M4)
- Process: writing-plans (for the M5 ops plan) → subagent-driven-development. Models: haiku for transcription-from-plan, sonnet for integration/judgment, opus for the final whole-branch review.
- Helper scripts (Git Bash): `C:\Users\omare\.claude\plugins\cache\claude-plugins-official\superpowers\6.0.3\skills\subagent-driven-development\scripts\{task-brief,review-package}`.
- Update `docs/TASKS.md` + `docs/memory/*` + `.superpowers/sdd/progress.md` at every checkpoint and before compaction.
- ⚠️ Recurring account **session limits** interrupted a subagent mid-M4 (Task 4). If a subagent returns "session limit": check `git status`/`git log` — finish correct-but-uncommitted partial work (a completion subagent or controller edit), don't re-do from scratch.

## Read first (in order)
1. `docs/memory/current-state.md` — live status
2. `docs/memory/decisions.md` — locked decisions (M4 added #31–36; do NOT re-litigate)
3. `docs/TASKS.md` — M0–M4 done; M5 (ops) todo
4. `.superpowers/sdd/progress.md` — M0–M4 execution ledger + deferred-minors + deploy runbook + the Node/ESM deploy blocker
5. Master spec: `docs/superpowers/specs/2026-06-29-herencia-design.md` (wins on conflict)
6. Domain docs as needed: `docs/16_DEPLOYMENT.md`, `13_PERFORMANCE.md`, `14_SECURITY.md`, `15_TESTING.md`.

## Machine health
- **C: ~full**; api tests use the win32 mongod-temp redirect; Playwright browsers → `E:\ms-playwright`. Machine Node is v24 but the project targets Node 20 (`.nvmrc`) — use `nvm use 20` for anything running the built server.

## Don't
- Don't re-litigate locked decisions. Don't rebuild/re-verify M0–M4. Don't re-dispatch any task the SDD ledger marks complete.
- Don't commit `.env`/`dist`/`node_modules`/`.serena`/`.superpowers`. Don't push (no remote — add one first if asked).
