# Decisions Log

Locked decisions. **Do not re-litigate** without explicit user change. Newest at bottom.

_2026-06-29_

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 1 | Language | English only (LTR) | User choice; drops i18n/RTL complexity |
| 2 | Currency | EGP | User confirmed; market is Egypt |
| 3 | Checkout | COD + WhatsApp order capture, no gateway | Lightweight starter; COD common in Egypt |
| 4 | Catalog | Perfumes + bundles | User choice |
| 5 | Rendering/SEO | Option A — SSR-lite (SPA + server-injected meta + prerendered static) | Balances SEO, performance, "lightweight" |
| 6 | Hosting | Single VPS (Node serves API + web) | User deferred; fits Option A, cheap |
| 7 | Auth | JWT in httpOnly cookie; roles customer/admin | Secure, simple |
| 8 | Images | Cloudinary (WebP/AVIF, responsive) | Performance + image quality |
| 9 | Animations | Framer Motion + CSS, lazy, prefers-reduced-motion | Engaging but perf-safe |
| 10 | Styling | Tailwind CSS + CSS-var brand tokens | Tiny output, fast, theme-able |
| 11 | Dark mode | Yes, `data-theme` | Required by user |
| 12 | Monorepo | npm workspaces (web/api/shared) | Light; shared types; no Nx/Turbo |
| 13 | Phasing | Build everything in phase 1 (incl. quiz + blog) | User choice |
| 14 | State persistence | Update memory + TASKS at every checkpoint | User requirement |
| 15 | Fonts | Cinzel (display) + Jost (body/UI) | Elegant heritage pairing, perf-friendly variable font |
| 16 | Images | Cloudinary confirmed by user | Performance + image quality |
| 17 | Spec | Approved by user 2026-06-29 | Ready for implementation planning |

_2026-06-30 (Milestone 1)_

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 18 | Admin auth (M1 interim) | `x-admin-token` header checked against `env.ADMIN_TOKEN` via `requireAdmin(token)` middleware; web stores token in `sessionStorage` behind an `AdminTokenGate` | Unblocks admin CRUD before the M2 auth system. **M2 replaces ONLY the middleware internals** (JWT httpOnly cookie + role check per decision #7) — route definitions and the gate seam stay identical. |
| 19 | SSR-lite implementation | Request-time `<head>` injection (server reads built `index.html`, strips `<title>`, injects per-route meta + OG + JSON-LD before `</head>`) + `/sitemap.xml` + `/robots.txt`. Build-time static prerender deferred to M4 perf pass. | Delivers per-route SEO now with minimal complexity; satisfies decision #5 Option A. |
| 20 | API test harness | `mongodb-memory-server`, with vitest `fileParallelism: false` + model `init()` index prebuild for determinism; on Windows, mongod temp redirected off the (full) C: drive via `MONGOMS_TMPDIR` (win32-only, env-overridable). | No external DB in tests; serialized to avoid parallel-mongod contention. Temp redirect is a local-machine workaround — revisit for CI/VPS (see next-session). |

_2026-07-01 (Milestone 2)_

| # | Decision | Choice | Rationale |
|---|---|---|---|
| 21 | Auth (real, replaces #18 interim) | JWT HS256, 7-day, in an httpOnly + SameSite=Lax + Secure-in-prod cookie named `herencia_token`; bcryptjs cost 12; `jsonwebtoken` lib; secret from `process.env.JWT_SECRET` (≥16). `requireAdmin` seam kept but internals = `authenticate`+`requireRole('admin')`; `ADMIN_TOKEN`/`x-admin-token`/`AdminTokenGate` removed. | Fulfils decision #7; admin route definitions unchanged per #18; the interim header path is fully retired (no dead code). |
| 22 | Cart pricing | Single `priceItems(items)` service is the authoritative price source, consumed by both the cart endpoints and order creation. Client only ever sends `{productId,sizeLabel,qty}`; server recomputes every line/total from the DB. Guest cart in `localStorage['herencia.cart']`; logged-in cart server-persisted (`Cart` model) and merged once on login. | "Never trust client prices" — one place to recompute; guest→account continuity. |
| 23 | Order creation | COD only, status starts `pending`. `createOrder` re-prices via `priceItems`, rejects on unavailable/empty, then atomic conditional stock decrement (`$elemMatch stock>=qty` + positional `$inc`) with rollback on any decrement miss AND on post-loop persistence failure. orderNumber `HRC-<base36 ts>-<rand>`. WhatsApp capture link built server-side from `Setting.whatsappNumber`. No multi-doc transaction (YAGNI; documented tradeoff). | Stock integrity without overselling; lightweight COD flow per spec. |
| 24 | Order status lifecycle | `ORDER_STATUS_TRANSITIONS` map governs legal moves (pending→confirmed/cancelled, confirmed→shipped/cancelled, shipped→delivered, delivered/cancelled terminal). Admin PUT enforces it (422 on illegal); the admin UI `<select>` only offers current+legal next states. | One source of truth for the lifecycle, enforced server- and client-side. |
| 25 | Error envelope | `HttpError` gained optional `details?`; `errorHandler` emits `{error:{message,code,details?}}`, including it only when present (backward-compatible). Used by the `cart_unavailable` 409 to return which lines failed. | Matches the spec's `details?` contract without breaking existing responses. |
