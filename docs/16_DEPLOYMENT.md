# 16 — Deployment

Single **VPS**. Node (`api`) serves the API and the built `web` SPA behind Nginx.

## Build
- `npm run build` (root) → builds `packages/shared`, `apps/web` (Vite → `dist`), and
  `apps/api` (tsc → `dist`). Web build is prerendered for static routes.

## Runtime
- **Node** runs `apps/api` (serves `/api/*`, SEO-injected SPA shell, sitemap/robots,
  static assets from `apps/web/dist`).
- **PM2** keeps the Node process alive (cluster optional) + restarts on crash/boot.
- **Nginx** reverse proxy: TLS termination, gzip/Brotli, caching for hashed assets,
  proxy to Node.
- **MongoDB**: Atlas (recommended) or self-hosted with backups.

## Environment
- `.env` (never committed): `NODE_ENV`, `PORT`, `MONGODB_URI`, `JWT_SECRET`,
  `CLOUDINARY_*`, `CLIENT_ORIGIN`, `WHATSAPP_NUMBER` (or via Settings).
- `config/env.ts` validates at boot.

## Process
1. Pull/clone on server. 2. `npm ci`. 3. `npm run build`. 4. `npm run seed` (first deploy).
5. `pm2 start` (ecosystem file). 6. Nginx points to Node port. 7. TLS via certbot.

## CI/CD (lightweight)
- On push: install, typecheck, lint, test, build. Optionally deploy on tagged release
  (SSH + `git pull && npm ci && npm run build && pm2 reload`).

## Observability
- PM2 logs; basic uptime check. Optional error tracking (e.g., Sentry) — roadmap.

## Backups
- Scheduled MongoDB backups (Atlas automated, or `mongodump` cron if self-hosted).
