# 07 — Backend

Node + Express + TypeScript. Mongoose for MongoDB. Zod for validation.

## Structure
- `config/` — `env.ts` (validated env via Zod), `db.ts` (Mongoose connection).
- `models/` — Mongoose schemas/models (one file per model).
- `modules/<feature>/` — `routes.ts`, `controller.ts`, `service.ts`.
- `middleware/` — `auth.ts` (JWT cookie), `requireRole.ts`, `validate.ts` (Zod),
  `error.ts` (central handler), `rateLimit.ts`.
- `seo/` — `injectMeta.ts`, `sitemap.ts`, `robots.ts`, `prerender` glue.
- `lib/` — `cloudinary.ts`, `jwt.ts`, `whatsapp.ts` (build order link), `slug.ts`.
- `server.ts` — app assembly, static serving of web build, SPA fallback w/ meta injection.

## Conventions
- Controllers are thin (parse/respond); services hold business logic; models hold
  persistence. Keeps each testable in isolation.
- All input validated by Zod (shared schemas) in `validate` middleware before controller.
- Central error handler maps known errors → status + `{ error }` shape; never leak stack
  traces in production.
- Async handlers wrapped to forward errors to the error middleware.

## Auth
- JWT signed, stored in httpOnly + Secure + SameSite cookie. `auth` middleware verifies
  and attaches `req.user`. `requireRole('admin')` guards admin routes.
- Passwords hashed with bcrypt (cost ≥ 12).

## Orders / WhatsApp
- On `POST /api/orders`: re-validate cart items + stock from DB (never trust client
  prices), compute totals server-side, create order, decrement stock, build WhatsApp link
  from `Setting.whatsappNumber` + order summary, return `{ order, whatsappUrl }`.

## Serving the SPA (prod)
- Static assets from `apps/web/dist`.
- Non-API, non-file GET → `seo/injectMeta` reads route-relevant data and returns the SPA
  shell with the right `<head>`. `/sitemap.xml` + `/robots.txt` generated.

## Seeding
- `npm run seed` (api): admin user, scent families, demo products/bundles, settings.
