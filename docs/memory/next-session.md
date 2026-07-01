# Next Session — START HERE

_Last updated: 2026-07-02_

## TL;DR
Milestones 0–4 are all merged to `master` (**M4 merge commit `cbe8ba7`**, feature branch deleted; final whole-branch review passed with the one blocking prerender/hydration fix applied; tests re-verified GREEN on master: shared 10f/41, api 27f/120, web 22f/37; lint 0, typecheck 0, build clean incl. prerender). **Your job: Milestone 5 (Ops / Deploy)** — the last milestone. Still no git remote — add one only if the user asks to push/PR.

## Milestone 5 (Ops / Deploy) — NEW plan required (this is the last milestone)
Deployment was intentionally deferred from M4 (user chose "code-polish, leave ops for now"). Before/along with deploy:
- ⚠️ **FIRST, HIGH PRIORITY — fix the built server so it runs on plain Node.** `node apps/api/dist/server.js` currently throws `ERR_MODULE_NOT_FOUND` (extensionless ESM relative imports; tsconfig `moduleResolution: Bundler`). It only ran via `tsx` in dev. Options: switch apps/api to `NodeNext` + add `.js` to all relative imports; OR bundle the server with esbuild; OR run prod via `tsx`. **This blocks both deploy AND the Playwright E2E run** (webServer starts the built server).
- Then: run the Playwright E2E (`npm run test:e2e`; browsers already targeted to `E:\ms-playwright`; needs Node 20 via `.nvmrc` and the real `.env`).
- Deployment: VPS + Nginx + PM2 (`docs/16_DEPLOYMENT.md` + deploy runbook at the bottom of the SDD ledger — Cloudinary env requirements, C:-drive/mongo-temp caveat).
- Live Lighthouse ≥ 90 mobile on Home + product (levers already implemented in M4; watch the framer-motion entry-chunk lever — see minors).
- Search Console + sitemap submission.

## Batched M4 deferred-minors (triage in the final review; full list at bottom of SDD ledger)
- Perf: framer-motion in the entry chunk (~114 kB gzip); lazy-load the route cross-fade if mobile Lighthouse < 90.
- CartDrawer: keys on AnimatePresence motion.divs; clear `addItem` setTimeout on unmount.
- ProductImage: guard blur `backgroundImage` to only set when the blur URL is http (avoids invalid CSS when no cloud).
- Playwright: remove machine-specific `PLAYWRIGHT_BROWSERS_PATH` from webServer.env; assert COD selection.
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
