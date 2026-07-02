# Deploying HERENCIA to Vercel (temporary test setup)

Two separate Vercel projects from this one monorepo: **frontend** (`apps/web`, static Vite)
and **backend** (`apps/api`, Express wrapped as a serverless function).

> The final target is a VPS (see `docs/memory/decisions.md`); this Vercel setup is for testing.

## What was prepared in the repo
- `apps/api/api/index.ts` — Vercel serverless entry that runs the Express app (`createApp`) and
  reuses the Mongoose connection across warm invocations.
- `apps/api/vercel.json` — rewrites every request to that function.
- `apps/web/vercel.json` — SPA fallback so deep links resolve to `index.html`.
- `apps/web/src/lib/api.ts` — calls `VITE_API_URL + path`, so the web can target a separate API origin.
- `apps/api/src/lib/authCookie.ts` — in production the auth cookie is `SameSite=None; Secure`
  so login works across the two domains.

## 1. Backend project (`apps/api`)
1. Vercel → New Project → import this repo.
2. **Root Directory: `apps/api`**, and turn ON **“Include files outside the Root Directory”**
   (needed so the `@herencia/shared` workspace package resolves). Framework preset: **Other**.
3. Environment variables (Production + Preview):
   - `NODE_ENV = production`
   - `MONGODB_URI = <your MongoDB Atlas URI>`
   - `JWT_SECRET = <random string, ≥16 chars>`
   - `CLIENT_ORIGIN = https://<your-web-project>.vercel.app`  (the frontend URL)
   - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
   - `WHATSAPP_NUMBER`
4. Deploy. Verify: open `https://<api>.vercel.app/api/health` → `{"status":"ok"}`.
5. In **MongoDB Atlas → Network Access**, allow Vercel egress (for testing, `0.0.0.0/0`).

## 2. Frontend project (`apps/web`)
1. Vercel → New Project → same repo.
2. **Root Directory: `apps/web`**. Framework preset: **Vite**.
3. Environment variables:
   - `VITE_API_URL = https://<your-api-project>.vercel.app`
   - `VITE_CLOUDINARY_CLOUD_NAME = <cloud name>`
4. Deploy.

## 3. Wire the two together
Because each needs the other's URL, do one pass then fix up:
1. Deploy the **API** first (set `CLIENT_ORIGIN` to the frontend URL you intend to use).
2. Deploy the **web** with `VITE_API_URL` = the API URL.
3. If the frontend URL changed, update the API's `CLIENT_ORIGIN` and redeploy the API.

## CLI alternative (you're logged in as `omarrislam`)
```bash
# Backend
cd apps/api && vercel link            # choose scope; set Root Directory to apps/api
vercel env add MONGODB_URI production # repeat for JWT_SECRET, CLIENT_ORIGIN, CLOUDINARY_*, WHATSAPP_NUMBER, NODE_ENV
vercel --prod

# Frontend
cd ../web && vercel link
vercel env add VITE_API_URL production
vercel env add VITE_CLOUDINARY_CLOUD_NAME production
vercel --prod
```

## Caveats (fine for testing)
- Serverless cold starts on the API; the in-memory rate limiter becomes per-instance.
- Seeding: run the seed against the same Atlas DB before testing (`npm run seed --workspace apps/api`).
- The API `helmet` CSP only applies to API responses (JSON); the static web is unaffected.
