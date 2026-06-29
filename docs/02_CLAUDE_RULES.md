# 02 — Working Rules (for Claude / contributors)

These rules govern how work is done on HERENCIA. Read before each session.

## Process
1. **State first.** At the start of a session read `docs/memory/current-state.md`,
   `docs/memory/next-session.md`, and `docs/memory/decisions.md`.
2. **Track everything.** Keep `docs/TASKS.md` and the live task list in sync. Mark a task
   `in_progress` before starting and `completed` only when truly done (tests pass).
3. **Persist state at checkpoints** and before any context compaction: update
   `docs/memory/current-state.md` (done / current / todo), `next-session.md`, and log new
   decisions in `decisions.md`.
4. **TDD where it pays off.** Write the test first for logic-bearing code (API handlers,
   cart math, quiz mapping, validators). Don't test trivial glue.
5. **Don't re-litigate locked decisions** (see `decisions.md` / spec §1).

## Code
- **Clean code, no overengineering. YAGNI.** Build what the spec asks, nothing speculative.
- Small, single-purpose modules. If a file does too much, split it.
- **TypeScript strict.** No `any` unless justified with a comment.
- **Validation at boundaries** with Zod (shared schemas). Never trust client input.
- Shared types/schemas live in `packages/shared` — define once, import both sides.
- Match existing patterns and file structure. Consistent naming.
- No secrets in client code or git. Use `.env`.

## Design / UX
- Honor the brand identity exactly (colors, fonts, crest) — see `docs/09_DESIGN_SYSTEM.md`.
- Mobile-first. Test mobile breakpoints first.
- Animations: transforms/opacity only, lazy-loaded, respect `prefers-reduced-motion`,
  never delay LCP or cause layout shift.
- Accessibility is not optional: semantic HTML, focus states, contrast, keyboard nav.

## Performance budget
- Keep initial JS small; code-split routes; lazy-load admin and heavy libs.
- Images via Cloudinary, responsive + lazy. Target Lighthouse ≥ 90 mobile.

## Definition of Done (per feature)
- Meets the requirement, types pass, lint passes, relevant tests pass.
- Responsive + dark mode verified. No console errors.
- `docs/TASKS.md` + memory updated.
