# Next Session — START HERE

_Last updated: 2026-06-30_

## TL;DR
Milestones 0 and 1 are DONE and **merged to `master`** (M1 merge commit `423e763`; feature branch deleted;
final whole-branch review passed with fixes applied). **Your job: build Milestone 2 (Commerce).**
Start by writing the M2 plan with the **writing-plans** skill (get it reviewed), then execute via
**subagent-driven-development** on a NEW feature branch `feat/milestone-2-commerce` (same workflow as M0/M1:
fresh implementer per task → spec+quality review after each → fix → final whole-branch review → merge).

## M2 scope (Commerce) — build all of it
- **Cart:** local (guest) cart + merge into account on login. Never trust client prices — server recomputes
  line totals from the DB on every read/derive.
- **Checkout (COD):** form → create Order → build WhatsApp order-capture link → confirmation page. No gateway.
- **Orders:** customer order view; admin order management with status lifecycle.
- **Auth:** real **JWT in httpOnly cookie + role guard (customer/admin)** that **REPLACES the INTERNALS of the
  interim `requireAdmin` middleware** (`apps/api/src/middleware/requireAdmin.ts`) — the route definitions and
  the `requireAdmin(...)` mount seam stay identical; only the check changes (cookie/JWT + role instead of the
  `x-admin-token` header). On web, the `AdminTokenGate` becomes a real login.
- **Account area + wishlist.**
- Keep reviews/quiz/banners/blog OUT (those are M3); animations/a11y-audit/perf/deploy are M4.

## Fold in early (cheap carry-overs from the M1 final review)
- **[F-min-5]** type-filter `GET /products/:slug/related` so a bundle can't surface in a perfume's "related".
- **[F-min-4]** `ProductCard` pairs `basePrice` (min size) with `sizes[0].compareAtPrice` — use the size that
  yields basePrice (or carry compareAt alongside basePrice).
- Full deferred list + deploy runbook: bottom of `.superpowers/sdd/progress.md`.

## ⚠️ Machine health (act on this)
The **C: drive is 100% full (~0.26 GB free)**. This already broke the MongoMemoryServer tests (needs
≥500 MB temp) — worked around by redirecting mongod temp to E: on Windows (`apps/api/vitest.config.ts`,
win32-only, `MONGOMS_TMPDIR`-overridable). Free up C: space. Note: API tests run **serialized**
(`fileParallelism: false` + model `init()` index prebuild) for determinism — the api suite takes ~33s.

## Read first (in order)
1. `docs/memory/current-state.md` — live status
2. `docs/memory/decisions.md` — locked decisions (do NOT re-litigate; incl. #18 interim admin token,
   #19 SSR-lite request-time injection, #20 api test harness)
3. `docs/TASKS.md` — done / current / todo (Milestones 0+1 done; M2–M4 todo)
4. `.superpowers/sdd/progress.md` — M0 + M1 execution ledger + deferred-minors triage + deploy runbook
5. Master spec: `docs/superpowers/specs/2026-06-29-herencia-design.md` (wins on conflict)
6. Domain docs as needed: `docs/04_DATABASE.md` (Order/User schemas), `docs/05_API.md`, `docs/07_BACKEND.md`
   (auth), `docs/08_*`/checkout, `docs/11_ADMIN.md`, `docs/17_ROADMAP.md`

## Repo state
- Branch `master` @ merge `423e763` (+ doc commits). Working tree clean (only untracked `.serena/`). **No git remote.**
- Full suite green & deterministic: `npm run lint` (0), `npm run typecheck` (0), `npm run test`
  (64 tests: shared 15, api 35, web 14), `npm run build`. Run lint via the **root** `npm run lint`
  (apps/web has no per-workspace lint script).
- `.env` exists (gitignored), filled by user: Atlas `MONGODB_URI`, Cloudinary keys, WhatsApp #, `ADMIN_TOKEN`,
  and `JWT_SECRET` (env schema already has it — M2 auth uses it).
- `npm run seed --workspace apps/api` populates 3 families, 4 perfumes, 2 bundles, Settings, admin user
  (admin@herencia.example / admin1234).
- DTO contract is single-sourced in `packages/shared` and consumed by api + web. Web client error envelope
  is `{ error: { message, code } }` (matches api `errorHandler`).

## How to work (reminders)
- Process: writing-plans → review plan → subagent-driven-development (controller = you; fresh implementer
  per task with a `task-brief`, spec+quality review after each, fix Critical/Important, final whole-branch
  review on opus, then finishing-a-development-branch).
- Each task: TDD, exact file paths, frequent commits; commit body ends with
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Work on `feat/milestone-2-commerce`, NOT `master`.**
- Update `docs/TASKS.md` + `docs/memory/*` + the SDD ledger at every checkpoint and before compaction.
- Helper scripts (run via Git Bash): `C:\Users\omare\.claude\plugins\cache\claude-plugins-official\superpowers\6.0.3\skills\subagent-driven-development\scripts\{task-brief,review-package}`.
- Model selection: cheap/haiku for transcription-from-plan & small mechanical fixes; sonnet for integration;
  opus for the final whole-branch review.

## Don't
- Don't re-ask locked decisions. Don't rebuild/re-verify M0 or M1. Don't build M3/M4 features in M2.
- Don't commit `.env`/`dist`/`node_modules`. Don't push (no remote yet — add a GitHub remote first if asked).
- Don't re-dispatch any task the SDD ledger already marks complete — trust the ledger + `git log` after a reset.
