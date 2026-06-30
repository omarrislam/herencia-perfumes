# Next Session — START HERE

_Last updated: 2026-06-30_

## TL;DR
Milestone 1 (Catalog & Content) is CODE-COMPLETE on branch `feat/milestone-1-catalog` — all 12 plan
tasks implemented, each task-reviewed and fixed, full workspace suite green. **Remaining gate: the FINAL
whole-branch review** (dispatch on the most capable model per subagent-driven-development), triaging the
minor-findings list at the bottom of `.superpowers/sdd/progress.md`; apply any Critical/Important fixes,
then **finish the branch** via the finishing-a-development-branch skill (merge to `main`). After that,
**Milestone 2 (Commerce)**: cart, COD checkout + WhatsApp, orders (customer + admin), and **real JWT
httpOnly-cookie auth + role guard that REPLACES the interim `requireAdmin` `x-admin-token` middleware
internals** (same seam — route defs unchanged), plus account area + wishlist.

## ⚠️ Machine health (act on this)
The **C: drive is 100% full (~0.26 GB free)**. This already broke the MongoMemoryServer tests (needs
≥500 MB temp) — worked around by redirecting mongod temp to E: on Windows (`apps/api/vitest.config.ts`,
win32-only, `MONGOMS_TMPDIR`-overridable). Free up C: space; and before CI/VPS, replace the machine-specific
temp redirect with an env-driven/OS-default approach (it's guarded to win32 so Linux is unaffected, but the
hardcoded `E:\Temp\mongodb-mem` default is local-only).

## Read first (in order)
1. `docs/memory/current-state.md` — live status
2. `docs/memory/decisions.md` — locked decisions (do NOT re-litigate)
3. `docs/TASKS.md` — done / current / todo
4. `.superpowers/sdd/progress.md` — M0 execution ledger + deferred minors
5. Master spec: `docs/superpowers/specs/2026-06-29-herencia-design.md`
6. Domain docs as needed: `docs/04_DATABASE.md`, `docs/05_API.md`, `docs/06_FRONTEND.md`,
   `docs/07_BACKEND.md`, `docs/11_ADMIN.md`, `docs/12_SEO.md`

## Repo state
- Branch `master` @ merge `572a2ed` (+ doc commit). Working tree clean. No git remote.
- Monorepo green: `npm run lint`, `npm run typecheck`, `npm run test` (10), `npm run build`.
- `.env` exists (gitignored), filled by user: Atlas `MONGODB_URI`, Cloudinary keys, WhatsApp #.
- `@herencia/shared` resolves via `dist`; root `typecheck`/`test` already build shared first,
  so consumers CAN now `import { ... } from '@herencia/shared'`.

## Milestone 1 scope (build all of it)
Models + data: **Product**, **ScentFamily** Mongoose models (schemas in `docs/04_DATABASE.md`);
**seed script** (admin user, scent families, 3–4 demo perfumes, 1–2 bundles, default Settings).
Admin: **products/bundles CRUD** + **Cloudinary image upload**.
Storefront: **Home**, **Products** list (search / filter by scent family·gender·price·
concentration / sort), **Product detail** (gallery, notes pyramid, sizes, related),
**Bundles** list/detail.
SEO: **server-injected meta** per route + **JSON-LD** (Product + AggregateRating) +
**sitemap.xml** + **robots.txt** + prerender static routes (Option A / SSR-lite).
(Reviews, quiz, banners, blog, cart/checkout, auth come in later milestones — keep them OUT of M1.)

## How to work (reminders)
- Process: writing-plans → review spec/plan → subagent-driven-development (fresh implementer
  per task, spec+quality review after each, final whole-branch review).
- Each task: TDD, exact file paths, frequent commits; commit body ends with
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- Work on a feature branch (e.g. `feat/milestone-1-catalog`), not `master`.
- Update `docs/TASKS.md` + `docs/memory/*` + the SDD ledger at every checkpoint.
- Helper scripts: `C:\Users\omare\.claude\plugins\cache\claude-plugins-official\superpowers\6.0.3\skills\subagent-driven-development\scripts\{task-brief,review-package}` (run via Git Bash).

## Carry-forward minors (defer to Milestone 4 polish, do NOT do now)
Theme FOUC / prefers-color-scheme pre-paint; lint `*.config.*` (currently ignored);
Button className double-space cosmetic; `@herencia/shared` pinned `"*"`; self-host/subset
fonts (currently Google Fonts CDN link).

## Don't
- Don't re-ask locked decisions. Don't rebuild/re-verify M0. Don't build later-milestone
  features in M1. Don't commit `.env`/`dist`/`node_modules`. Don't push (no remote yet).
