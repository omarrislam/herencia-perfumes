# CLAUDE.md — HERENCIA

Guidance for Claude/agents working in this repo. Read at the start of every session.

## Start-of-session ritual
1. Read `docs/memory/current-state.md`, `docs/memory/next-session.md`,
   `docs/memory/decisions.md`.
2. Read `docs/TASKS.md` for what's done / current / todo.
3. Follow `docs/02_CLAUDE_RULES.md`.

## State persistence (required)
- Keep `docs/TASKS.md` and the live task list in sync.
- Update `docs/memory/current-state.md` + `next-session.md` at every checkpoint and
  **before any context compaction**. Log new decisions in `docs/memory/decisions.md`.

## Non-negotiables
- **Clean code, no overengineering. YAGNI.**
- TypeScript strict; validate input with shared Zod schemas; never trust client prices.
- Mobile-first; dark mode; brand fidelity to `/identity` (`docs/09_DESIGN_SYSTEM.md`).
- Performance budget: Lighthouse ≥ 90 mobile; code-split; lazy-load heavy/admin code.
- Animations: transforms/opacity only, lazy, respect `prefers-reduced-motion`, no CLS.
- Accessibility: semantic HTML, focus states, contrast, keyboard nav.

## Locked decisions (don't re-litigate — see `docs/memory/decisions.md`)
English only (LTR) · EGP · COD + WhatsApp (no gateway) · perfumes + bundles ·
SSR-lite (Option A) · VPS · JWT httpOnly cookie · Cloudinary · Tailwind · npm workspaces ·
build everything in phase 1.

## Git
- Git not initialized yet. **Commit/push only when the user asks.**
- If on default branch, branch first. End commit messages with the required co-author line.

## Source of truth
Master spec: `docs/superpowers/specs/2026-06-29-herencia-design.md` (wins on conflict).
