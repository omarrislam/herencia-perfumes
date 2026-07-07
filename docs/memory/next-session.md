# Next Session — START HERE

_Last updated: 2026-07-07_

## NEW (2026-07-07, round 12): homepage trimmed (3-Steps one-liners, essence+craft merged — `craft` key removed app-wide, gifting headline-only), checkout payment cards get green selected state, Admin Orders rows expand to full details + Delete order (`DELETE /api/admin/orders/:id`), hero LCP fixed (hero `<img>` now uses the exact preloaded w=1600 URL + fetchpriority=high; splash 1100→400ms). Suites: shared 41 / api 135 / web 38. Uncommitted on master.

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
