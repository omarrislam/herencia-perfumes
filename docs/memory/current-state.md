# Current State

_Last updated: 2026-06-29_

## Phase
**Milestone 0 COMPLETE; next = write Milestone 1 (catalog) plan**

## Done
- Explored prompt, suggested structure, and full brand identity.
- Locked all major decisions (see `decisions.md`).
- Wrote master spec: `docs/superpowers/specs/2026-06-29-herencia-design.md`.
- Wrote docs scaffolding `00`–`17`, `TASKS.md`, and memory files.
- **Task 1:** Root monorepo — npm workspaces, root scripts, TS base config, ESLint, Prettier.
- **Task 2:** `packages/shared` — types, Zod schemas (createOrderSchema / CreateOrderInput), enums/constants.
- **Task 3:** `apps/api` — env validation (loadEnv/Env), Mongoose connection, error handler, base middleware.
- **Task 4:** `apps/web` — Vite/React/Tailwind shell, brand tokens + CSS custom properties, light/dark ThemeProvider, Button primitive, app shell skeleton.
- **Task 5:** Full-workspace cleanup (brand fonts, React lint rules, cross-platform dev script, test isolation); lint/typecheck/test/build all green.

## In progress
- Nothing — Milestone 0 complete.

## Next (todo)
- Write Milestone 1 (catalog & content) implementation plan via writing-plans skill.
- Execute Milestone 1: Product + ScentFamily models, Admin CRUD, Storefront pages, SEO.

## Resolved open items
- Body font: **Cinzel (display) + Jost (body/UI)** — now loaded in index.html.
- Images: **Cloudinary** (confirmed).
- Hosting: single VPS.
- Spec approved by user.

## Notes
- Git initialized; Milestone 0 committed across Tasks 1–5.
- Seed script and full router deferred to Milestone 1 (per roadmap note in 17_ROADMAP.md).
