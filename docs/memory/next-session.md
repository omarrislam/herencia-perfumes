# Next Session — START HERE

_Last updated: 2026-07-01_

## TL;DR
Milestones 0, 1 are merged to `master`. **Milestone 2 (Commerce) is COMPLETE on `feat/milestone-2-commerce`** (final whole-branch review on opus = READY TO MERGE, no Critical/Important blockers; full suite green: api 76, web 22, shared ~28; lint/typecheck/build clean). **First job: merge M2 to `master`** (via finishing-a-development-branch), **then build Milestone 3 (Engagement).**

## Immediate step: merge M2
- Use **finishing-a-development-branch** on `feat/milestone-2-commerce` → merge into `master` (no-ff). No git remote yet — do NOT push; add a GitHub remote first only if the user asks to push/PR.
- After merge: delete the feature branch, confirm `master` is green, update `current-state.md` to "M2 merged".

## Then: Milestone 3 (Engagement) — build all of it
- **Ratings & reviews:** customer review submit (auth, one per product, pending), admin moderation (approve/reject/delete), recompute `Product.rating` on approve/delete, show approved reviews on product detail.
- **Find Your Scent quiz:** question config (admin), flow, runtime result from accumulated weights → recommended active products.
- **Offer banners:** scheduling (startsAt/endsAt, placement), admin CRUD, render active banners by placement.
- **Blog:** post CRUD (admin), index + post pages, SEO meta + JSON-LD (reuse the M1 SSR-lite injection seam).
- Keep animations/a11y-audit/perf/deploy OUT (those are M4).
- The DB schemas already exist in `docs/04_DATABASE.md` (Review, Banner, BlogPost, Quiz). The API surface is sketched in `docs/05_API.md`.

## How to work (same as M0–M2)
- Process: **writing-plans** (get the M3 plan reviewed) → **subagent-driven-development** on a NEW branch `feat/milestone-3-engagement` (fresh implementer per task with a `task-brief`; spec+quality review after each; fix Critical/Important; final whole-branch review on opus; then finishing-a-development-branch).
- Models: cheapest/haiku for pure transcription-from-plan tasks; sonnet for integration/judgment; opus for the final whole-branch review.
- Helper scripts (Git Bash): `C:\Users\omare\.claude\plugins\cache\claude-plugins-official\superpowers\6.0.3\skills\subagent-driven-development\scripts\{task-brief,review-package}`.
- Update `docs/TASKS.md` + `docs/memory/*` + `.superpowers/sdd/progress.md` at every checkpoint and before compaction.

## Carry-overs to fold into M3 (cheap, from the M2 final review — triaged defer-M3)
- Consolidate the duplicated `objectId` regex across shared schema files (`_primitives.ts`) [M2-min-2].
- Broaden thin test coverage: cart PUT/merge 401, adminOrders invalid-status & same-status, login unknown-email, related non-empty guard, jwt expired/tampered [M2-min-3/5/6/8/9/14/17].
- `/orders/me` real pagination if order volume grows [M2-min-15].

## ⚠️ Machine health (still applies)
The **C: drive is ~full**. MongoMemoryServer api tests rely on the win32 temp redirect to E: + injected test `JWT_SECRET` in `apps/api/vitest.config.ts`. Free up C: and replace the redirect before CI/VPS.

## Read first (in order)
1. `docs/memory/current-state.md` — live status
2. `docs/memory/decisions.md` — locked decisions (do NOT re-litigate; M2 added #21–25)
3. `docs/TASKS.md` — done/current/todo (M0–M2 done; M3–M4 todo)
4. `.superpowers/sdd/progress.md` — M0+M1+M2 execution ledger + deferred-minors triage + deploy runbook
5. Master spec: `docs/superpowers/specs/2026-06-29-herencia-design.md` (wins on conflict)
6. Domain docs as needed: `docs/04_DATABASE.md` (Review/Banner/BlogPost/Quiz), `docs/05_API.md`, `docs/06`–`docs/17`.

## Don't
- Don't re-ask locked decisions. Don't rebuild/re-verify M0/M1/M2. Don't build M4 polish in M3.
- Don't commit `.env`/`dist`/`node_modules`. Don't push (no remote yet — add one first if asked).
- Don't re-dispatch any task the SDD ledger marks complete — trust the ledger + `git log` after a reset/compaction.
