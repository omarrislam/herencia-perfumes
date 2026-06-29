# Milestone 0 — Foundations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the HERENCIA monorepo skeleton — workspaces, tooling, shared types/schemas, a booting API with health + env validation + DB connection, and a Vite/React/Tailwind web app with brand tokens, dark mode, and base UI — so all later milestones have a tested foundation to build on.

**Architecture:** npm-workspaces monorepo with three packages: `packages/shared` (TS types + Zod schemas, the front/back contract), `apps/api` (Express + TS), and `apps/web` (Vite + React + TS + Tailwind). The API validates env at boot with Zod, connects to MongoDB via Mongoose, and exposes `/api/health`. The web app ships brand design tokens as CSS variables mapped into Tailwind, with a `data-theme` light/dark toggle.

**Tech Stack:** TypeScript (strict), npm workspaces, Express, Mongoose, Zod, Vite, React, React Router, Tailwind CSS, Vitest, Supertest, React Testing Library, ESLint, Prettier.

## Global Constraints

- **Language/locale:** English only (LTR). Currency **EGP**.
- **TypeScript:** strict mode on every package. No `any` without a justifying comment.
- **Validation:** All external input validated with **Zod** schemas from `packages/shared`.
- **Brand colors (exact):** maroon `#4B1D1D`, gold `#C29A5B`, cream `#F5EBC6`, parchment `#EBD6B1`.
- **Fonts:** Cinzel (display), Jost (body/UI).
- **Performance:** mobile-first; code-split routes; lazy-load heavy/admin code (later milestones).
- **No overengineering / YAGNI.** Small, single-purpose modules. Frequent commits.
- **Node:** ≥ 20. Package manager: **npm**.
- **Source of truth:** `docs/superpowers/specs/2026-06-29-herencia-design.md`.

---

### Task 1: Monorepo + tooling skeleton

**Files:**
- Create: `package.json` (root, workspaces)
- Create: `tsconfig.base.json`
- Create: `.editorconfig`
- Create: `.prettierrc.json`
- Create: `.eslintrc.cjs`
- Create: `.nvmrc`
- Create: `.env.example`
- Modify: none (`.gitignore` already exists)

**Interfaces:**
- Produces: root scripts `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`; workspaces `apps/*` and `packages/*`; shared `tsconfig.base.json` extended by every package.

- [ ] **Step 1: Create root `package.json`**

```json
{
  "name": "herencia",
  "private": true,
  "version": "0.0.0",
  "engines": { "node": ">=20" },
  "workspaces": ["packages/*", "apps/*"],
  "scripts": {
    "dev": "npm run dev --workspace apps/api & npm run dev --workspace apps/web",
    "build": "npm run build --workspace packages/shared && npm run build --workspace apps/web && npm run build --workspace apps/api",
    "lint": "eslint . --ext .ts,.tsx",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "test": "npm run test --workspaces --if-present",
    "format": "prettier --write ."
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "eslint": "^8.57.0",
    "eslint-plugin-react": "^7.34.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "prettier": "^3.3.0",
    "typescript": "^5.5.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.base.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Create supporting config files**

`.editorconfig`:
```ini
root = true
[*]
charset = utf-8
indent_style = space
indent_size = 2
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
```

`.prettierrc.json`:
```json
{ "singleQuote": true, "semi": true, "printWidth": 100, "trailingComma": "all" }
```

`.eslintrc.cjs`:
```js
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  settings: { react: { version: 'detect' } },
  env: { node: true, browser: true, es2022: true },
  ignorePatterns: ['dist', 'node_modules', '*.config.*'],
};
```

`.nvmrc`:
```
20
```

`.env.example`:
```
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/herencia
JWT_SECRET=change-me-in-production
CLIENT_ORIGIN=http://localhost:5173
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
WHATSAPP_NUMBER=
```

- [ ] **Step 4: Install and verify**

Run: `npm install`
Expected: completes without error; root `node_modules` created.

Run: `npx eslint --version`
Expected: prints a version (eslint resolves).

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.base.json .editorconfig .prettierrc.json .eslintrc.cjs .nvmrc .env.example package-lock.json
git commit -m "chore: monorepo skeleton and tooling"
```

---

### Task 2: `packages/shared` — types, enums, and Zod schemas

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/vitest.config.ts`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/schemas/order.ts`
- Test: `packages/shared/src/schemas/order.test.ts`

**Interfaces:**
- Produces: `ORDER_STATUS`, `GENDER`, `CONCENTRATION`, `PRODUCT_TYPE` enums; `createOrderSchema` (Zod) with inferred type `CreateOrderInput`; barrel export from `@herencia/shared`.

- [ ] **Step 1: Create package manifest and tsconfig**

`packages/shared/package.json`:
```json
{
  "name": "@herencia/shared",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "import": "./dist/index.js" } },
  "scripts": {
    "build": "tsc -p tsconfig.json",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": { "zod": "^3.23.0" },
  "devDependencies": { "typescript": "^5.5.0", "vitest": "^2.0.0" }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src" },
  "include": ["src"]
}
```

`packages/shared/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node' } });
```

- [ ] **Step 2: Write the failing test**

`packages/shared/src/schemas/order.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createOrderSchema } from './order';

describe('createOrderSchema', () => {
  const valid = {
    items: [{ productId: '64f000000000000000000000', sizeLabel: '50ml', qty: 2 }],
    customer: { name: 'Sara', phone: '01000000000' },
    shippingAddress: { line1: '1 Nile St', city: 'Cairo', governorate: 'Cairo', phone: '01000000000' },
  };

  it('accepts a valid order', () => {
    expect(createOrderSchema.parse(valid)).toMatchObject({ items: [{ qty: 2 }] });
  });

  it('rejects qty below 1', () => {
    const bad = { ...valid, items: [{ ...valid.items[0], qty: 0 }] };
    expect(() => createOrderSchema.parse(bad)).toThrow();
  });

  it('rejects empty items', () => {
    expect(() => createOrderSchema.parse({ ...valid, items: [] })).toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test --workspace packages/shared`
Expected: FAIL — cannot resolve `./order`.

- [ ] **Step 4: Implement enums and schema**

`packages/shared/src/enums.ts`:
```ts
export const ORDER_STATUS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const GENDER = ['men', 'women', 'unisex'] as const;
export type Gender = (typeof GENDER)[number];

export const CONCENTRATION = ['EDT', 'EDP', 'Extrait', 'Other'] as const;
export type Concentration = (typeof CONCENTRATION)[number];

export const PRODUCT_TYPE = ['perfume', 'bundle'] as const;
export type ProductType = (typeof PRODUCT_TYPE)[number];
```

`packages/shared/src/schemas/order.ts`:
```ts
import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'invalid id');

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: objectId,
        sizeLabel: z.string().min(1),
        qty: z.number().int().min(1),
      }),
    )
    .min(1),
  customer: z.object({
    name: z.string().min(1),
    phone: z.string().min(6),
    email: z.string().email().optional(),
  }),
  shippingAddress: z.object({
    line1: z.string().min(1),
    line2: z.string().optional(),
    city: z.string().min(1),
    governorate: z.string().min(1),
    phone: z.string().min(6),
  }),
  notes: z.string().max(500).optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
```

`packages/shared/src/index.ts`:
```ts
export * from './enums';
export * from './schemas/order';
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test --workspace packages/shared`
Expected: PASS (3 tests).

- [ ] **Step 6: Build to verify declaration output**

Run: `npm run build --workspace packages/shared`
Expected: `packages/shared/dist/index.js` and `index.d.ts` exist.

- [ ] **Step 7: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): enums and order Zod schema with tests"
```

---

### Task 3: `apps/api` — Express server, env validation, health endpoint

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/vitest.config.ts`
- Create: `apps/api/src/config/env.ts`
- Create: `apps/api/src/app.ts`
- Create: `apps/api/src/server.ts`
- Create: `apps/api/src/middleware/error.ts`
- Test: `apps/api/src/app.test.ts`
- Test: `apps/api/src/config/env.test.ts`

**Interfaces:**
- Consumes: `@herencia/shared`.
- Produces: `createApp()` returning an Express app with `GET /api/health` → `{ status: 'ok' }`; `loadEnv(raw)` returning a validated, typed env object; `errorHandler` Express middleware.

- [ ] **Step 1: Create manifest, tsconfig, vitest config**

`apps/api/package.json`:
```json
{
  "name": "@herencia/api",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc -p tsconfig.json",
    "start": "node dist/server.js",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@herencia/shared": "*",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "express": "^4.19.0",
    "helmet": "^7.1.0",
    "mongoose": "^8.5.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/cookie-parser": "^1.4.7",
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/node": "^20.14.0",
    "supertest": "^7.0.0",
    "@types/supertest": "^6.0.2",
    "tsx": "^4.16.0",
    "typescript": "^5.5.0",
    "vitest": "^2.0.0"
  }
}
```

`apps/api/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "outDir": "dist", "rootDir": "src", "types": ["node"] },
  "include": ["src"]
}
```

`apps/api/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { environment: 'node' } });
```

- [ ] **Step 2: Write the failing env test**

`apps/api/src/config/env.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { loadEnv } from './env';

describe('loadEnv', () => {
  const base = {
    NODE_ENV: 'test',
    PORT: '4000',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/herencia',
    JWT_SECRET: 'x'.repeat(16),
    CLIENT_ORIGIN: 'http://localhost:5173',
  };

  it('parses a valid env and coerces PORT to number', () => {
    const env = loadEnv(base);
    expect(env.PORT).toBe(4000);
    expect(env.MONGODB_URI).toContain('mongodb://');
  });

  it('throws when JWT_SECRET is too short', () => {
    expect(() => loadEnv({ ...base, JWT_SECRET: 'short' })).toThrow();
  });
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `npm test --workspace apps/api`
Expected: FAIL — cannot resolve `./env`.

- [ ] **Step 4: Implement env loader**

`apps/api/src/config/env.ts`:
```ts
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_SECRET: z.string().min(16),
  CLIENT_ORIGIN: z.string().url(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  WHATSAPP_NUMBER: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(raw: NodeJS.ProcessEnv | Record<string, unknown>): Env {
  return envSchema.parse(raw);
}
```

- [ ] **Step 5: Write the failing app test**

`apps/api/src/app.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from './app';

describe('GET /api/health', () => {
  it('returns ok', async () => {
    const res = await request(createApp({ clientOrigin: 'http://localhost:5173' })).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('returns 404 JSON for unknown api route', async () => {
    const res = await request(createApp({ clientOrigin: 'http://localhost:5173' })).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Run: `npm test --workspace apps/api`
Expected: FAIL — cannot resolve `./app`.

- [ ] **Step 7: Implement error middleware and app**

`apps/api/src/middleware/error.ts`:
```ts
import type { NextFunction, Request, Response } from 'express';

export class HttpError extends Error {
  constructor(public status: number, message: string, public code = 'error') {
    super(message);
  }
}

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: { message: 'Not found', code: 'not_found' } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  const status = err instanceof HttpError ? err.status : 500;
  const code = err instanceof HttpError ? err.code : 'internal';
  const message = err instanceof HttpError ? err.message : 'Internal server error';
  res.status(status).json({ error: { message, code } });
}
```

`apps/api/src/app.ts`:
```ts
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler, notFound } from './middleware/error';

export function createApp(opts: { clientOrigin: string }): Express {
  const app = express();
  app.use(helmet());
  app.use(cors({ origin: opts.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 8: Implement server entry (DB connect + listen)**

`apps/api/src/server.ts`:
```ts
import mongoose from 'mongoose';
import { createApp } from './app';
import { loadEnv } from './config/env';

async function main() {
  const env = loadEnv(process.env);
  await mongoose.connect(env.MONGODB_URI);
  const app = createApp({ clientOrigin: env.CLIENT_ORIGIN });
  app.listen(env.PORT, () => console.log(`API listening on :${env.PORT}`));
}

main().catch((err) => {
  console.error('Failed to start API', err);
  process.exit(1);
});
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npm test --workspace apps/api`
Expected: PASS (env: 2, app: 2).

- [ ] **Step 10: Commit**

```bash
git add apps/api
git commit -m "feat(api): express app, env validation, health endpoint with tests"
```

---

### Task 4: `apps/web` — Vite + React + Tailwind + brand tokens + dark mode

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/vitest.setup.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/styles/index.css`
- Create: `apps/web/src/app/ThemeProvider.tsx`
- Create: `apps/web/src/components/Button.tsx`
- Test: `apps/web/src/app/ThemeProvider.test.tsx`
- Test: `apps/web/src/components/Button.test.tsx`

**Interfaces:**
- Consumes: brand tokens (CSS vars).
- Produces: `ThemeProvider` + `useTheme()` → `{ theme, toggle }` writing `data-theme` to `<html>`; `Button` component with `variant: 'primary' | 'secondary' | 'ghost'`.

- [ ] **Step 1: Create manifest and configs**

`apps/web/package.json`:
```json
{
  "name": "@herencia/web",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit -p tsconfig.json",
    "test": "vitest run"
  },
  "dependencies": {
    "@herencia/shared": "*",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-router-dom": "^6.26.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "jsdom": "^24.1.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0",
    "vitest": "^2.0.0"
  }
}
```

`apps/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "jsx": "react-jsx", "noEmit": true, "types": ["vitest/globals", "@testing-library/jest-dom"] },
  "include": ["src", "vitest.setup.ts"]
}
```

`apps/web/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': 'http://localhost:4000' } },
});
```

`apps/web/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'jsdom', globals: true, setupFiles: ['./vitest.setup.ts'] },
});
```

`apps/web/vitest.setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

`apps/web/postcss.config.js`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } };
```

- [ ] **Step 2: Create Tailwind config with brand tokens**

`apps/web/tailwind.config.ts`:
```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        maroon: '#4B1D1D',
        gold: '#C29A5B',
        cream: '#F5EBC6',
        parchment: '#EBD6B1',
        // semantic tokens bound to CSS vars (theme-aware)
        bg: 'var(--bg)',
        surface: 'var(--surface)',
        content: 'var(--text)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        line: 'var(--border)',
      },
      fontFamily: {
        display: ['Cinzel', 'serif'],
        body: ['Jost', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
```

- [ ] **Step 3: Create global styles with theme tokens**

`apps/web/src/styles/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root[data-theme='light'] {
  --bg: #f5ebc6;
  --surface: #fffdf6;
  --text: #4b1d1d;
  --muted: #6b5b4b;
  --accent: #c29a5b;
  --border: rgba(194, 154, 91, 0.35);
}
:root[data-theme='dark'] {
  --bg: #1a0e0e;
  --surface: #241414;
  --text: #f5ebc6;
  --muted: #c9b79a;
  --accent: #c29a5b;
  --border: rgba(194, 154, 91, 0.3);
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Jost', system-ui, sans-serif;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
}
```

- [ ] **Step 4: Write the failing ThemeProvider test**

`apps/web/src/app/ThemeProvider.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider, useTheme } from './ThemeProvider';

function Probe() {
  const { theme, toggle } = useTheme();
  return <button onClick={toggle}>theme:{theme}</button>;
}

describe('ThemeProvider', () => {
  it('defaults to light and toggles to dark on <html>', async () => {
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByText('theme:light')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');

    await userEvent.click(screen.getByRole('button'));
    expect(screen.getByText('theme:dark')).toBeInTheDocument();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
```

- [ ] **Step 5: Run it to verify it fails**

Run: `npm test --workspace apps/web`
Expected: FAIL — cannot resolve `./ThemeProvider`.

- [ ] **Step 6: Implement ThemeProvider**

`apps/web/src/app/ThemeProvider.tsx`:
```tsx
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
type ThemeCtx = { theme: Theme; toggle: () => void };

const Ctx = createContext<ThemeCtx | null>(null);

function getInitial(): Theme {
  const stored = typeof localStorage !== 'undefined' ? localStorage.getItem('theme') : null;
  return stored === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(getInitial);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      /* ignore storage errors */
    }
  }, [theme]);

  const value = useMemo<ThemeCtx>(
    () => ({ theme, toggle: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) }),
    [theme],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
```

- [ ] **Step 7: Write the failing Button test**

`apps/web/src/components/Button.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';

describe('Button', () => {
  it('renders children and fires onClick', async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Shop now</Button>);
    await userEvent.click(screen.getByRole('button', { name: 'Shop now' }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('applies the secondary variant class', () => {
    render(<Button variant="secondary">x</Button>);
    expect(screen.getByRole('button').className).toContain('border');
  });
});
```

- [ ] **Step 8: Run it to verify it fails**

Run: `npm test --workspace apps/web`
Expected: FAIL — cannot resolve `./Button`.

- [ ] **Step 9: Implement Button**

`apps/web/src/components/Button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const base =
  'inline-flex items-center justify-center rounded-md px-4 py-2 font-body text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary: 'bg-maroon text-cream hover:bg-maroon/90',
  secondary: 'border border-gold text-content hover:bg-gold/10',
  ghost: 'text-content hover:bg-gold/10',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}
```

- [ ] **Step 10: Create app entry and index.html**

`apps/web/index.html`:
```html
<!doctype html>
<html lang="en" data-theme="light">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>HERENCIA — Luxury in every drop</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`apps/web/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, useTheme } from './app/ThemeProvider';
import { Button } from './components/Button';
import './styles/index.css';

function App() {
  const { theme, toggle } = useTheme();
  return (
    <main className="min-h-screen grid place-items-center gap-6 p-8 text-center">
      <h1 className="font-display text-4xl text-content">HERENCIA</h1>
      <p className="font-body text-muted">Luxury in every drop.</p>
      <Button onClick={toggle}>Toggle theme (now: {theme})</Button>
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
```

- [ ] **Step 11: Run tests to verify they pass**

Run: `npm test --workspace apps/web`
Expected: PASS (ThemeProvider: 1, Button: 2).

- [ ] **Step 12: Verify the build and dev server**

Run: `npm run build --workspace apps/web`
Expected: build succeeds; `apps/web/dist` created.

Run: `npm run dev --workspace apps/web` (then stop)
Expected: Vite serves on `http://localhost:5173`; page shows HERENCIA + working theme toggle.

- [ ] **Step 13: Commit**

```bash
git add apps/web
git commit -m "feat(web): vite+react+tailwind shell with brand tokens, dark mode, Button"
```

---

### Task 5: Root verification + state update

**Files:**
- Modify: `docs/TASKS.md`
- Modify: `docs/memory/current-state.md`
- Modify: `docs/memory/next-session.md`

**Interfaces:**
- Consumes: all prior tasks.
- Produces: a green monorepo (`lint`, `typecheck`, `test`, `build` all pass) and updated state docs.

- [ ] **Step 1: Run the full workspace checks**

Run: `npm run typecheck`
Expected: passes for shared, api, web.

Run: `npm run test`
Expected: all package tests pass.

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: shared → web → api all build.

- [ ] **Step 2: Update tracking docs**

In `docs/TASKS.md`, mark the Milestone 0 items `[x]`.
In `docs/memory/current-state.md`, set phase to "Milestone 0 complete; starting Milestone 1" and update done/next.
In `docs/memory/next-session.md`, point to Milestone 1 (catalog) as the next plan to write.

- [ ] **Step 3: Commit**

```bash
git add docs
git commit -m "docs: mark Milestone 0 complete, update state"
```

---

## Self-Review

**Spec coverage (Milestone 0 scope):**
- Monorepo (npm workspaces, web/api/shared) → Tasks 1–4. ✓
- Shared types + Zod schemas → Task 2. ✓
- Env validation, Mongo connection, error handler, base middleware → Task 3. ✓
- Tailwind + brand tokens + light/dark themes → Task 4. ✓
- App shell + a UI primitive (Button) + theme toggle → Task 4. ✓
- Seed script, full router, app layouts, additional models → **intentionally deferred** to Milestone 1 (they belong with catalog/data work); noted in `17_ROADMAP.md`.

**Placeholder scan:** No TBD/TODO; every code step contains complete code; every command has expected output. ✓

**Type consistency:** `loadEnv`/`Env`, `createApp({ clientOrigin })`, `useTheme()` → `{ theme, toggle }`, `Button` `variant` union, `createOrderSchema`/`CreateOrderInput` are used consistently across tasks and tests. ✓

---

## Notes for later milestones (not in this plan)
Milestone 1 will add: Mongoose models (Product, ScentFamily), seed script, full router + Storefront/Admin layouts, catalog pages, Cloudinary pipeline, and SEO meta injection — each with its own plan via the writing-plans skill.
