# 06 — Frontend

Vite + React + TypeScript. Tailwind for styling. React Router for routing. Framer Motion
for animation. React Query (recommended) for server state.

## Structure
- `app/` — router, providers (theme, auth, cart, query client), layout shells
  (StorefrontLayout, AdminLayout).
- `pages/` — one component per route.
- `features/` — domain logic grouped: `products/`, `cart/`, `auth/`, `reviews/`,
  `quiz/`, `orders/`, `blog/`, `admin/`.
- `components/` — reusable presentational UI (Button, Card, Modal, Rating, Price,
  ProductCard, Drawer, Skeleton...).
- `lib/` — `api` (typed client), `hooks`, `utils`, `seo`, `cloudinary`.
- `styles/` — Tailwind entry, tokens, theme.

## State
- **Server state:** React Query (caching, loading/error, invalidation on mutation).
- **Cart:** Context + `localStorage`; merge into account on login.
- **Theme:** Context writing `data-theme` to `<html>`, persisted.
- **Auth:** Context from `/api/auth/me`; httpOnly cookie sent automatically.

## Routing
- Storefront routes eager-ish but **code-split per route**.
- `/admin/*` lazy-loaded behind an auth+role guard (separate chunk).
- 404 branded page.

## Forms
- React Hook Form + Zod resolver using **shared schemas** (`packages/shared`).
- Accessible labels, inline errors, disabled/loading states.

## Data & SEO on the client
- Use `lib/seo` helpers to set document head client-side too (keeps parity with
  server-injected meta during client navigation).
- Images via `lib/cloudinary` → responsive `srcset`, lazy, blur placeholder.

## Quality bar
- Strict TS. No `any` without reason. Components small and focused.
- Every interactive element keyboard-accessible with visible focus.
- Loading skeletons over spinners for perceived performance.
