# Next Session — START HERE

_Last updated: 2026-07-29_

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
