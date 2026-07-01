# Next Session — START HERE

_Last updated: 2026-07-01_

## TL;DR
Milestones 0, 1, 2, **and 3 (Engagement) are all merged to `master`** (M3 merge commit `a270e80`, feature branch deleted; tests re-verified green on merged master: shared 10 files, api 26 files/~105 tests, web 17 files/27 tests; lint/typecheck/build clean). **Your job: build Milestone 4 (Polish & ship)** — the final milestone. Still no git remote — add one only if the user asks to push/PR.

## Milestone 4 (Polish & ship) — the final milestone
- **Animations pass:** Framer Motion + CSS, lazy, `prefers-reduced-motion`, transforms/opacity only, no CLS. Section reveals, card/button micro-interactions, cart-drawer motion, logo gold shimmer.
- **Accessibility audit:** the deferred a11y minors (batch them — see below), focus management (CartDrawer focus trap/return), form labels, keyboard nav, contrast, semantic landmarks.
- **Performance pass:** Lighthouse ≥ 90 mobile — code-split/lazy audit, image sizing via Cloudinary, font loading, bundle trimming, build-time static prerender for static routes (deferred from M1 decision #19).
- **Testing:** broaden unit/integration coverage (the deferred test-hardening gaps) + an E2E smoke of browse→cart→checkout.
- **Deployment:** VPS + Nginx + PM2 (see `docs/16_DEPLOYMENT.md` + the deploy runbook at the bottom of the SDD ledger — includes the `VITE_CLOUDINARY_CLOUD_NAME`/`CLOUDINARY_CLOUD_NAME` env requirements and the C:-drive/mongo-temp caveat). Submit sitemap to Search Console.
- **Rate-limiting** (deferred through M2/M3): add to auth + orders + review/mutation routes here (security pass).

## Batch these deferred minors into M4 (from the M1/M2/M3 final reviews)
- **Dark-mode/theming:** replace raw-palette status badges + error/success colors (AdminReviews/AdminBanners/AdminBlog: `green-100/yellow-100`, `red-500`, `green-600/amber-500`) with semantic tokens; qty-stepper `bg-gold/10` → semantic accent.
- **A11y:** CartDrawer focus trap/return; AdminQuiz answer-remove `aria-label` + `type="button"`; Login/Register visible labels; AdminOrders `<select>` aria-label; `key={idx}` → stable keys where lists can reorder.
- **Correctness/cleanup:** map review E11000→409 (concurrent double-submit); admin banner/blog mutations invalidate the public queries; blog markdown renderer; per-review Rating already fixed; admin delete errors surface `ApiError`; test-hardening (adminBanners inactive visibility, seo real-draft fallback + `<`-escape assertion, review service single `agg[0]` local, drop redundant unique-slug index).
- Full per-item list: bottom of `.superpowers/sdd/progress.md`.

## How to work (same as M0–M3)
- Process: **writing-plans** (get the M4 plan reviewed) → **subagent-driven-development** on a NEW branch `feat/milestone-4-polish` (fresh implementer per task; spec+quality review after each; fix Critical/Important; final whole-branch review on opus; then finishing-a-development-branch).
- Models: cheapest/haiku for pure transcription-from-plan; sonnet for integration/judgment; opus for the final whole-branch review.
- Helper scripts (Git Bash): `C:\Users\omare\.claude\plugins\cache\claude-plugins-official\superpowers\6.0.3\skills\subagent-driven-development\scripts\{task-brief,review-package}`.
- Update `docs/TASKS.md` + `docs/memory/*` + `.superpowers/sdd/progress.md` at every checkpoint and before compaction.
- ⚠️ Recurring account **session limits** interrupted a few M3 subagents mid-task. If a subagent returns a "session limit" message: check `git status`/`git log` — if it left correct-but-uncommitted partial work, dispatch a completion subagent to finish+verify+commit it (don't re-do from scratch); if the tree is clean, just re-dispatch.

## ⚠️ Machine health (still applies)
The **C: drive is ~full**. MongoMemoryServer api tests rely on the win32 temp redirect to E: + injected test `JWT_SECRET` in `apps/api/vitest.config.ts`. Free up C: and replace the redirect before CI/VPS.

## Read first (in order)
1. `docs/memory/current-state.md` — live status
2. `docs/memory/decisions.md` — locked decisions (do NOT re-litigate; M3 added #26–30)
3. `docs/TASKS.md` — done/current/todo (M0–M3 done; M4 todo)
4. `.superpowers/sdd/progress.md` — M0–M3 execution ledger + deferred-minors triage + deploy runbook
5. Master spec: `docs/superpowers/specs/2026-06-29-herencia-design.md` (wins on conflict)
6. Domain docs as needed: `docs/10_ANIMATIONS.md`, `docs/13_PERFORMANCE.md`, `docs/14_SECURITY.md`, `docs/15_TESTING.md`, `docs/16_DEPLOYMENT.md`.

## Don't
- Don't re-ask locked decisions. Don't rebuild/re-verify M0–M3. Don't add features beyond the spec in M4.
- Don't commit `.env`/`dist`/`node_modules`/`.serena`. Don't push (no remote yet — add one first if asked).
- Don't re-dispatch any task the SDD ledger marks complete — trust the ledger + `git log` after a reset/compaction.
