# 14 — Security

## Auth & sessions
- JWT in **httpOnly + Secure + SameSite=Lax** cookie. No tokens in localStorage.
- Passwords hashed with **bcrypt** (cost ≥ 12). Never log/return password fields.
- `auth` middleware verifies cookie; `requireRole('admin')` on every `/api/admin/*` route.

## Input & data
- **Validate all input** with shared Zod schemas before it reaches a controller.
- Never trust client prices/totals — recompute server-side from DB at checkout.
- Mongoose schema validation as a second layer; sanitize query operators (no `$` injection).

## Transport & headers
- HTTPS only (Nginx). **Helmet** for security headers + sensible CSP.
- CORS restricted to known origins; credentials enabled for the cookie.

## Abuse prevention
- Rate-limit auth (login/register) and order creation.
- Basic bot/spam guard on reviews and order forms.

## Secrets & config
- All secrets in `.env` (DB URI, JWT secret, Cloudinary keys). **Never** committed.
- `config/env.ts` validates required env at boot; fail fast if missing.
- Separate dev/prod secrets.

## Files / uploads
- Image uploads go to Cloudinary with constraints (type/size); store only references.

## Operational
- Central error handler hides stack traces in production.
- Keep dependencies updated; run `npm audit` periodically.
- Principle of least privilege for DB user.
