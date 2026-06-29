# 03 — Architecture

## Monorepo layout (npm workspaces)

```
herencia/
├─ apps/
│  ├─ web/                 # Vite + React + TS (storefront + admin)
│  │  ├─ src/
│  │  │  ├─ app/           # router, providers, layout shells
│  │  │  ├─ pages/         # route components (storefront + admin)
│  │  │  ├─ features/      # cart, auth, products, reviews, quiz, ...
│  │  │  ├─ components/    # shared UI (Button, Card, Modal, ...)
│  │  │  ├─ lib/           # api client, hooks, utils, seo helpers
│  │  │  ├─ styles/        # tailwind entry, tokens, themes
│  │  │  └─ main.tsx
│  │  └─ index.html
│  └─ api/                 # Node + Express + TS
│     └─ src/
│        ├─ config/        # env, db connection
│        ├─ models/        # Mongoose models
│        ├─ modules/       # feature modules: routes + controllers + services
│        ├─ middleware/    # auth, error, rate-limit, validation
│        ├─ seo/           # meta injection, sitemap, robots, prerender
│        ├─ lib/           # cloudinary, jwt, mailer/whatsapp helpers
│        └─ server.ts
├─ packages/
│  └─ shared/              # types + Zod schemas + constants (imported by both apps)
└─ docs/
```

## Responsibilities

- **web** — all UI. Talks to API via a typed client (`lib/api`). No business logic that
  belongs server-side. Admin is a lazy-loaded route subtree.
- **api** — REST under `/api/*`, auth, persistence, business rules, SEO injection, and
  serving the built SPA in production.
- **shared** — the contract: `Product`, `Order`, `User`, etc. + Zod schemas + enums
  (order status, scent family, concentration). One definition, both sides import it.

## Request rendering (Option A — SSR-lite)

```
Browser ──GET /products/midnight-oud──► Nginx ──► Node (api)
                                                   │
                          not /api/* and not a file│
                                                   ▼
                                   Read product from Mongo
                                   Inject <title>/meta/OG/JSON-LD into index.html
                                                   ▼
                                   Return HTML shell with correct <head>
                                                   ▼
                                   React hydrates, fetches /api data, renders body
```

- Static routes are prerendered at build time (HTML on disk).
- `GET /api/*` → JSON. `GET /sitemap.xml`, `/robots.txt` → generated.

## Module pattern (api)

Each feature is a folder: `routes.ts` (Express router) → `controller.ts` (HTTP) →
`service.ts` (business logic, talks to models). Validation via shared Zod schema in
middleware. Keeps HTTP, logic, and persistence separable and testable.

## Data flow (web)

UI → feature hook (`useProducts`, `useCart`) → typed api client → API. Server state via
a small data-fetching layer (React Query recommended; or a thin custom hook layer to stay
light). Cart state is local (context + localStorage), synced to account when logged in.
