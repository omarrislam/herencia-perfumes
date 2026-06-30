# Milestone 1 — Catalog & Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the HERENCIA catalog: Product + ScentFamily data layer, a public read API with search/filter/sort, interim-guarded admin CRUD with Cloudinary upload, a seeded demo dataset, the storefront browsing experience (Home, Products, Product detail, Bundles), and SSR-lite SEO (per-route meta + JSON-LD + sitemap + robots).

**Architecture:** The `packages/shared` package gains Product/ScentFamily types and Zod schemas (the front/back contract). `apps/api` adds Mongoose models, public catalog routes, interim-guarded admin routes, a seed script, and serves the built SPA with request-time `<head>` injection for SEO. `apps/web` adds React Query + React Router with code-split routes, a typed API client, reusable catalog components, the storefront pages, and a minimal admin CRUD surface.

**Tech Stack:** TypeScript (strict), Express, Mongoose, Zod, Cloudinary, bcryptjs, Vite, React, React Router v6, @tanstack/react-query, React Hook Form, Tailwind CSS, Vitest, Supertest, mongodb-memory-server, React Testing Library.

## Global Constraints

- **Language/locale:** English only (LTR). Currency **EGP** — money is a `number`, 2-decimal precision enforced at the app layer.
- **TypeScript:** strict on every package. No `any` without a justifying comment. `noUncheckedIndexedAccess` is on — guard array/index access.
- **Validation:** All external input validated with **Zod** schemas from `@herencia/shared`. **Never trust client prices** — server recomputes from the DB on every read/derive.
- **Brand colors (exact):** maroon `#4B1D1D`, gold `#C29A5B`, cream `#F5EBC6`, parchment `#EBD6B1`. Fonts: Cinzel (display), Jost (body/UI). Semantic Tailwind tokens already exist: `bg`, `surface`, `content`, `muted`, `accent`, `line`.
- **Mobile-first; dark mode via `data-theme`.** Semantic HTML, focus states, keyboard nav, image `alt` everywhere.
- **Performance:** route-based code splitting; admin lazy-loaded as its own chunk; lazy images. No layout shift.
- **Auth is OUT of M1** (M2 owns register/login/logout + real guards). Admin routes are protected by an **interim** `requireAdmin` middleware that checks an `x-admin-token` header against `env.ADMIN_TOKEN`. M2 replaces only the middleware internals (JWT httpOnly cookie + role check); route definitions stay identical.
- **SSR-lite (Option A):** server injects per-route `<head>` at request time. Build-time static prerender is deferred to the M4 perf pass.
- **No overengineering / YAGNI.** Small, single-purpose modules. TDD. Frequent commits. Commit body ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Tests:** Vitest everywhere. API integration tests use `mongodb-memory-server` (no external DB). Web component tests use React Testing Library + jsdom.
- **Branch:** `feat/milestone-1-catalog` (NOT `master`). No git remote — do not push.
- **Source of truth:** `docs/superpowers/specs/2026-06-29-herencia-design.md`. Schemas: `docs/04_DATABASE.md`. API: `docs/05_API.md`.

---

### Task 1: Shared catalog types & Zod schemas

**Files:**
- Create: `packages/shared/src/schemas/catalog.ts`
- Create: `packages/shared/src/schemas/catalog.test.ts`
- Create: `packages/shared/src/util/slugify.ts`
- Create: `packages/shared/src/util/slugify.test.ts`
- Modify: `packages/shared/src/index.ts`

**Interfaces:**
- Consumes: `GENDER`, `CONCENTRATION`, `PRODUCT_TYPE` from `packages/shared/src/enums.ts` (already exist).
- Produces (imported by API and web via `@herencia/shared`):
  - `slugify(input: string): string`
  - `scentFamilySchema` → `ScentFamilyInput`; `productSizeSchema`; `adminProductSchema` → `AdminProductInput`; `productQuerySchema` → `ProductQuery`.
  - `PRODUCT_SORT` (`readonly ['newest','price-asc','price-desc','rating']`) + `ProductSort`.
  - Wire types (what the API returns, what the web consumes): `ScentFamilyDTO`, `ProductSizeDTO`, `ProductDTO`, `ProductListDTO`.

- [ ] **Step 1: Write the failing slugify test**

```ts
// packages/shared/src/util/slugify.test.ts
import { describe, it, expect } from 'vitest';
import { slugify } from './slugify';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('Royal Oud')).toBe('royal-oud');
  });
  it('strips punctuation and collapses separators', () => {
    expect(slugify('  Amber & Musk!! ')).toBe('amber-musk');
  });
  it('removes leading/trailing hyphens', () => {
    expect(slugify('--Hello--')).toBe('hello');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace packages/shared`
Expected: FAIL — `Cannot find module './slugify'`.

- [ ] **Step 3: Implement slugify**

```ts
// packages/shared/src/util/slugify.ts
export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

- [ ] **Step 4: Write the failing catalog schema test**

```ts
// packages/shared/src/schemas/catalog.test.ts
import { describe, it, expect } from 'vitest';
import { adminProductSchema, productQuerySchema, scentFamilySchema } from './catalog';

describe('scentFamilySchema', () => {
  it('accepts a valid family', () => {
    expect(scentFamilySchema.parse({ name: 'Woody', order: 1 })).toMatchObject({ name: 'Woody', order: 1 });
  });
  it('defaults order to 0', () => {
    expect(scentFamilySchema.parse({ name: 'Floral' }).order).toBe(0);
  });
});

describe('adminProductSchema', () => {
  const base = {
    name: 'Royal Oud',
    type: 'perfume' as const,
    shortDesc: 'A regal oud.',
    description: 'Long description.',
    images: ['herencia/royal-oud'],
    sizes: [{ label: '50ml', price: 1200, stock: 5 }],
    scentFamily: 'a'.repeat(24),
    notes: { top: ['bergamot'], heart: ['rose'], base: ['oud'] },
    gender: 'unisex' as const,
    concentration: 'EDP' as const,
  };
  it('accepts a valid perfume', () => {
    expect(adminProductSchema.parse(base).name).toBe('Royal Oud');
  });
  it('rejects a product with no sizes', () => {
    expect(() => adminProductSchema.parse({ ...base, sizes: [] })).toThrow();
  });
  it('rejects negative price', () => {
    expect(() => adminProductSchema.parse({ ...base, sizes: [{ label: '50ml', price: -1, stock: 0 }] })).toThrow();
  });
  it('requires bundleItems when type is bundle', () => {
    expect(() => adminProductSchema.parse({ ...base, type: 'bundle' })).toThrow();
    const bundle = adminProductSchema.parse({
      ...base,
      type: 'bundle',
      bundleItems: [{ product: 'b'.repeat(24), qty: 2 }],
    });
    expect(bundle.bundleItems?.[0]?.qty).toBe(2);
  });
});

describe('productQuerySchema', () => {
  it('coerces and defaults paging/sort', () => {
    const q = productQuerySchema.parse({ page: '2', minPrice: '100' });
    expect(q.page).toBe(2);
    expect(q.limit).toBe(12);
    expect(q.sort).toBe('newest');
    expect(q.minPrice).toBe(100);
  });
  it('rejects an unknown sort', () => {
    expect(() => productQuerySchema.parse({ sort: 'banana' })).toThrow();
  });
});
```

- [ ] **Step 5: Run tests to verify they fail**

Run: `npm run test --workspace packages/shared`
Expected: FAIL — `Cannot find module './catalog'`.

- [ ] **Step 6: Implement catalog schemas & DTO types**

```ts
// packages/shared/src/schemas/catalog.ts
import { z } from 'zod';
import { CONCENTRATION, GENDER, PRODUCT_TYPE } from '../enums';
import { slugify } from '../util/slugify';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'invalid id');

// 2-decimal EGP money guard
const money = z
  .number()
  .nonnegative()
  .refine((n) => Math.round(n * 100) === n * 100, 'price must have at most 2 decimals');

export const PRODUCT_SORT = ['newest', 'price-asc', 'price-desc', 'rating'] as const;
export type ProductSort = (typeof PRODUCT_SORT)[number];

export const scentFamilySchema = z.object({
  name: z.string().min(1).max(60),
  slug: z.string().optional(),
  description: z.string().max(500).optional(),
  order: z.number().int().min(0).default(0),
});
export type ScentFamilyInput = z.infer<typeof scentFamilySchema>;

export const productSizeSchema = z.object({
  label: z.string().min(1).max(20),
  price: money,
  compareAtPrice: money.optional(),
  stock: z.number().int().min(0),
});

export const adminProductSchema = z
  .object({
    name: z.string().min(1).max(120),
    slug: z.string().optional(),
    type: z.enum(PRODUCT_TYPE),
    shortDesc: z.string().min(1).max(200),
    description: z.string().min(1),
    images: z.array(z.string().min(1)).min(1),
    sizes: z.array(productSizeSchema).min(1),
    scentFamily: objectId,
    notes: z.object({
      top: z.array(z.string().min(1)).default([]),
      heart: z.array(z.string().min(1)).default([]),
      base: z.array(z.string().min(1)).default([]),
    }),
    gender: z.enum(GENDER),
    concentration: z.enum(CONCENTRATION),
    isFeatured: z.boolean().default(false),
    isActive: z.boolean().default(true),
    seo: z.object({ title: z.string().optional(), description: z.string().optional() }).default({}),
    bundleItems: z.array(z.object({ product: objectId, qty: z.number().int().min(1) })).optional(),
  })
  .refine((p) => p.type !== 'bundle' || (p.bundleItems && p.bundleItems.length > 0), {
    message: 'bundle requires at least one bundleItem',
    path: ['bundleItems'],
  });
export type AdminProductInput = z.infer<typeof adminProductSchema>;

export const productQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  type: z.enum(PRODUCT_TYPE).optional(),
  scentFamily: objectId.optional(),
  gender: z.enum(GENDER).optional(),
  concentration: z.enum(CONCENTRATION).optional(),
  minPrice: z.coerce.number().nonnegative().optional(),
  maxPrice: z.coerce.number().nonnegative().optional(),
  sort: z.enum(PRODUCT_SORT).default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(48).default(12),
});
export type ProductQuery = z.infer<typeof productQuerySchema>;

// ---- Wire DTOs (API output shape; ids are strings) ----
export type ScentFamilyDTO = { id: string; name: string; slug: string; description?: string; order: number };
export type ProductSizeDTO = { label: string; price: number; compareAtPrice?: number; stock: number };
export type ProductDTO = {
  id: string;
  name: string;
  slug: string;
  type: (typeof PRODUCT_TYPE)[number];
  shortDesc: string;
  description: string;
  images: string[];
  sizes: ProductSizeDTO[];
  basePrice: number;
  scentFamily: ScentFamilyDTO | null;
  notes: { top: string[]; heart: string[]; base: string[] };
  gender: (typeof GENDER)[number];
  concentration: (typeof CONCENTRATION)[number];
  rating: { avg: number; count: number };
  isFeatured: boolean;
  isActive: boolean;
  seo: { title?: string; description?: string };
  bundleItems?: { product: ProductDTO | string; qty: number }[];
};
export type ProductListDTO = { items: ProductDTO[]; total: number; page: number; pages: number };

export { slugify };
```

- [ ] **Step 7: Re-export from the package index**

```ts
// packages/shared/src/index.ts
export * from './enums';
export * from './schemas/order';
export * from './schemas/catalog';
export * from './util/slugify';
```

- [ ] **Step 8: Run all shared tests**

Run: `npm run test --workspace packages/shared`
Expected: PASS (existing order tests + new slugify + catalog tests).

- [ ] **Step 9: Typecheck the workspace (builds shared first)**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add packages/shared
git commit -m "feat(shared): catalog Zod schemas, DTOs, and slugify util"
```

---

### Task 2: ScentFamily & Product Mongoose models

**Files:**
- Create: `apps/api/src/models/ScentFamily.ts`
- Create: `apps/api/src/models/Product.ts`
- Create: `apps/api/src/models/Product.test.ts`
- Create: `apps/api/src/test/db.ts` (shared in-memory Mongo test helper)
- Modify: `apps/api/package.json` (add `mongodb-memory-server` dev dep)

**Interfaces:**
- Consumes: `slugify` from `@herencia/shared`; enums `GENDER`, `CONCENTRATION`, `PRODUCT_TYPE`.
- Produces:
  - `ScentFamily` model with fields `{ name, slug, description?, order }`.
  - `Product` model with the `docs/04_DATABASE.md` shape; a `pre('validate')` hook that sets `slug` from `name` (if absent) and `basePrice = min(sizes.price)`.
  - `apps/api/src/test/db.ts`: `connectMemory(): Promise<void>`, `disconnectMemory(): Promise<void>`, `clearDb(): Promise<void>`.

- [ ] **Step 1: Add the in-memory Mongo dev dependency**

```bash
npm install -D mongodb-memory-server --workspace apps/api
```

- [ ] **Step 2: Create the test DB helper**

```ts
// apps/api/src/test/db.ts
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mem: MongoMemoryServer | null = null;

export async function connectMemory(): Promise<void> {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
}

export async function disconnectMemory(): Promise<void> {
  await mongoose.disconnect();
  if (mem) await mem.stop();
  mem = null;
}

export async function clearDb(): Promise<void> {
  const { collections } = mongoose.connection;
  for (const key of Object.keys(collections)) {
    await collections[key]!.deleteMany({});
  }
}
```

- [ ] **Step 3: Write the failing Product model test**

```ts
// apps/api/src/models/Product.test.ts
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { ScentFamily } from './ScentFamily';
import { Product } from './Product';

beforeAll(connectMemory);
afterAll(disconnectMemory);
afterEach(clearDb);

async function makeFamily() {
  return ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
}

describe('Product model', () => {
  it('derives slug from name and basePrice from min size price', async () => {
    const fam = await makeFamily();
    const p = await Product.create({
      name: 'Royal Oud',
      type: 'perfume',
      shortDesc: 'Regal',
      description: 'Long',
      images: ['herencia/royal-oud'],
      sizes: [
        { label: '100ml', price: 1800, stock: 3 },
        { label: '50ml', price: 1200, stock: 5 },
      ],
      scentFamily: fam._id,
      notes: { top: ['bergamot'], heart: ['rose'], base: ['oud'] },
      gender: 'unisex',
      concentration: 'EDP',
    });
    expect(p.slug).toBe('royal-oud');
    expect(p.basePrice).toBe(1200);
  });

  it('enforces unique slug', async () => {
    const fam = await makeFamily();
    const data = {
      name: 'Amber',
      type: 'perfume' as const,
      shortDesc: 's',
      description: 'd',
      images: ['x'],
      sizes: [{ label: '50ml', price: 900, stock: 1 }],
      scentFamily: fam._id,
      notes: { top: [], heart: [], base: [] },
      gender: 'women' as const,
      concentration: 'EDT' as const,
    };
    await Product.create(data);
    await expect(Product.create(data)).rejects.toBeTruthy();
  });
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `npm run test --workspace apps/api`
Expected: FAIL — `Cannot find module './ScentFamily'`.

- [ ] **Step 5: Implement the ScentFamily model**

```ts
// apps/api/src/models/ScentFamily.ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const scentFamilySchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

export type ScentFamilyDoc = InferSchemaType<typeof scentFamilySchema>;
export const ScentFamily =
  mongoose.models.ScentFamily ?? mongoose.model('ScentFamily', scentFamilySchema);
```

- [ ] **Step 6: Implement the Product model**

```ts
// apps/api/src/models/Product.ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { slugify } from '@herencia/shared';

const sizeSchema = new Schema(
  {
    label: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    compareAtPrice: { type: Number, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
  },
  { _id: false },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    type: { type: String, enum: ['perfume', 'bundle'], required: true, index: true },
    shortDesc: { type: String, required: true },
    description: { type: String, required: true },
    images: { type: [String], default: [] },
    sizes: { type: [sizeSchema], required: true },
    basePrice: { type: Number, required: true, index: true },
    scentFamily: { type: Schema.Types.ObjectId, ref: 'ScentFamily', required: true, index: true },
    notes: {
      top: { type: [String], default: [] },
      heart: { type: [String], default: [] },
      base: { type: [String], default: [] },
    },
    gender: { type: String, enum: ['men', 'women', 'unisex'], required: true, index: true },
    concentration: { type: String, enum: ['EDT', 'EDP', 'Extrait', 'Other'], required: true },
    rating: {
      avg: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    isFeatured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true, index: true },
    seo: { title: { type: String }, description: { type: String } },
    bundleItems: [
      {
        _id: false,
        product: { type: Schema.Types.ObjectId, ref: 'Product' },
        qty: { type: Number, min: 1 },
      },
    ],
  },
  { timestamps: true },
);

productSchema.index({ name: 'text', shortDesc: 'text' });

productSchema.pre('validate', function (next) {
  const doc = this as unknown as { name: string; slug?: string; sizes: { price: number }[]; basePrice?: number };
  if (!doc.slug && doc.name) doc.slug = slugify(doc.name);
  if (Array.isArray(doc.sizes) && doc.sizes.length > 0) {
    doc.basePrice = Math.min(...doc.sizes.map((s) => s.price));
  }
  next();
});

export type ProductDoc = InferSchemaType<typeof productSchema>;
export const Product = mongoose.models.Product ?? mongoose.model('Product', productSchema);
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm run test --workspace apps/api`
Expected: PASS (existing app tests + new Product model tests).

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(api): ScentFamily & Product models + in-memory test harness"
```

---

### Task 3: Public catalog read API

**Files:**
- Create: `apps/api/src/lib/serialize.ts` (doc → DTO mappers)
- Create: `apps/api/src/routes/catalog.ts`
- Create: `apps/api/src/routes/catalog.test.ts`
- Modify: `apps/api/src/app.ts` (mount the router)

**Interfaces:**
- Consumes: `Product`, `ScentFamily` models; `productQuerySchema`, DTO types from `@herencia/shared`; `HttpError` from `../middleware/error`.
- Produces:
  - `serialize.ts`: `toScentFamilyDTO(doc)`, `toProductDTO(doc, opts?: { populateBundle?: boolean })`.
  - `catalogRouter` mounted at `/api`, exposing:
    - `GET /api/scent-families` → `ScentFamilyDTO[]` (sorted by `order`).
    - `GET /api/products` → `ProductListDTO` (filters/sort/pagination; only `isActive`).
    - `GET /api/products/:slug` → `ProductDTO` (404 if missing/inactive).
    - `GET /api/products/:slug/related` → `ProductDTO[]` (same scentFamily, max 4, excludes self).

- [ ] **Step 1: Write the failing route test**

```ts
// apps/api/src/routes/catalog.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';

const app = createApp({ clientOrigin: 'http://localhost:5173' });

beforeAll(connectMemory);
afterAll(disconnectMemory);

beforeEach(async () => {
  await clearDb();
  const woody = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const floral = await ScentFamily.create({ name: 'Floral', slug: 'floral', order: 2 });
  await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['x'],
    sizes: [{ label: '50ml', price: 1200, stock: 5 }], scentFamily: woody._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP', isFeatured: true,
  });
  await Product.create({
    name: 'Rose Veil', type: 'perfume', shortDesc: 's', description: 'd', images: ['x'],
    sizes: [{ label: '50ml', price: 800, stock: 2 }], scentFamily: floral._id,
    notes: { top: [], heart: [], base: [] }, gender: 'women', concentration: 'EDT',
  });
  await Product.create({
    name: 'Hidden Gem', type: 'perfume', shortDesc: 's', description: 'd', images: ['x'],
    sizes: [{ label: '50ml', price: 500, stock: 0 }], scentFamily: woody._id,
    notes: { top: [], heart: [], base: [] }, gender: 'men', concentration: 'EDT', isActive: false,
  });
});

describe('GET /api/scent-families', () => {
  it('returns families ordered by order', async () => {
    const res = await request(app).get('/api/scent-families');
    expect(res.status).toBe(200);
    expect(res.body.map((f: { name: string }) => f.name)).toEqual(['Woody', 'Floral']);
  });
});

describe('GET /api/products', () => {
  it('lists only active products with paging envelope', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.page).toBe(1);
    expect(res.body.items.every((p: { isActive: boolean }) => p.isActive)).toBe(true);
  });
  it('filters by gender', async () => {
    const res = await request(app).get('/api/products?gender=women');
    expect(res.body.total).toBe(1);
    expect(res.body.items[0].name).toBe('Rose Veil');
  });
  it('sorts by price ascending', async () => {
    const res = await request(app).get('/api/products?sort=price-asc');
    expect(res.body.items[0].name).toBe('Rose Veil');
  });
  it('rejects an invalid sort with 400', async () => {
    const res = await request(app).get('/api/products?sort=banana');
    expect(res.status).toBe(400);
  });
});

describe('GET /api/products/:slug', () => {
  it('returns a product with populated scentFamily', async () => {
    const res = await request(app).get('/api/products/royal-oud');
    expect(res.status).toBe(200);
    expect(res.body.scentFamily.name).toBe('Woody');
  });
  it('404s for an inactive product', async () => {
    const res = await request(app).get('/api/products/hidden-gem');
    expect(res.status).toBe(404);
  });
});

describe('GET /api/products/:slug/related', () => {
  it('returns same-family products excluding self', async () => {
    const res = await request(app).get('/api/products/royal-oud/related');
    expect(res.status).toBe(200);
    expect(res.body.every((p: { slug: string }) => p.slug !== 'royal-oud')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api`
Expected: FAIL — router not mounted / `Cannot find module './routes/catalog'`.

- [ ] **Step 3: Implement the serializers**

```ts
// apps/api/src/lib/serialize.ts
import type { ProductDTO, ScentFamilyDTO } from '@herencia/shared';

// `doc` is a populated/lean Mongoose document; we map to plain DTOs.
type AnyDoc = Record<string, any>;

export function toScentFamilyDTO(doc: AnyDoc): ScentFamilyDTO {
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? undefined,
    order: doc.order ?? 0,
  };
}

export function toProductDTO(doc: AnyDoc, opts: { populateBundle?: boolean } = {}): ProductDTO {
  const fam = doc.scentFamily && typeof doc.scentFamily === 'object' && doc.scentFamily._id
    ? toScentFamilyDTO(doc.scentFamily)
    : null;
  return {
    id: String(doc._id),
    name: doc.name,
    slug: doc.slug,
    type: doc.type,
    shortDesc: doc.shortDesc,
    description: doc.description,
    images: doc.images ?? [],
    sizes: (doc.sizes ?? []).map((s: AnyDoc) => ({
      label: s.label,
      price: s.price,
      compareAtPrice: s.compareAtPrice ?? undefined,
      stock: s.stock,
    })),
    basePrice: doc.basePrice,
    scentFamily: fam,
    notes: { top: doc.notes?.top ?? [], heart: doc.notes?.heart ?? [], base: doc.notes?.base ?? [] },
    gender: doc.gender,
    concentration: doc.concentration,
    rating: { avg: doc.rating?.avg ?? 0, count: doc.rating?.count ?? 0 },
    isFeatured: !!doc.isFeatured,
    isActive: !!doc.isActive,
    seo: { title: doc.seo?.title ?? undefined, description: doc.seo?.description ?? undefined },
    bundleItems: doc.bundleItems?.map((b: AnyDoc) => ({
      product:
        opts.populateBundle && b.product && typeof b.product === 'object' && b.product._id
          ? toProductDTO(b.product)
          : String(b.product),
      qty: b.qty,
    })),
  };
}
```

- [ ] **Step 4: Implement the catalog router**

```ts
// apps/api/src/routes/catalog.ts
import { Router } from 'express';
import { productQuerySchema } from '@herencia/shared';
import { Product } from '../models/Product';
import { ScentFamily } from '../models/ScentFamily';
import { HttpError } from '../middleware/error';
import { toProductDTO, toScentFamilyDTO } from '../lib/serialize';

export const catalogRouter = Router();

catalogRouter.get('/scent-families', async (_req, res, next) => {
  try {
    const families = await ScentFamily.find().sort({ order: 1, name: 1 }).lean();
    res.json(families.map(toScentFamilyDTO));
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products', async (req, res, next) => {
  try {
    const parsed = productQuerySchema.safeParse(req.query);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid query', 'invalid_query');
    const q = parsed.data;

    const filter: Record<string, unknown> = { isActive: true };
    if (q.type) filter.type = q.type;
    if (q.scentFamily) filter.scentFamily = q.scentFamily;
    if (q.gender) filter.gender = q.gender;
    if (q.concentration) filter.concentration = q.concentration;
    if (q.minPrice != null || q.maxPrice != null) {
      filter.basePrice = {
        ...(q.minPrice != null ? { $gte: q.minPrice } : {}),
        ...(q.maxPrice != null ? { $lte: q.maxPrice } : {}),
      };
    }
    if (q.q) filter.$text = { $search: q.q };

    const sortMap: Record<typeof q.sort, Record<string, 1 | -1>> = {
      newest: { createdAt: -1 },
      'price-asc': { basePrice: 1 },
      'price-desc': { basePrice: -1 },
      rating: { 'rating.avg': -1 },
    };

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort(sortMap[q.sort])
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .populate('scentFamily')
        .lean(),
      Product.countDocuments(filter),
    ]);

    res.json({
      items: items.map((d) => toProductDTO(d)),
      total,
      page: q.page,
      pages: Math.max(1, Math.ceil(total / q.limit)),
    });
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products/:slug', async (req, res, next) => {
  try {
    const doc = await Product.findOne({ slug: req.params.slug, isActive: true })
      .populate('scentFamily')
      .populate('bundleItems.product')
      .lean();
    if (!doc) throw new HttpError(404, 'Product not found', 'not_found');
    res.json(toProductDTO(doc, { populateBundle: true }));
  } catch (err) {
    next(err);
  }
});

catalogRouter.get('/products/:slug/related', async (req, res, next) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug, isActive: true }).lean();
    if (!product) throw new HttpError(404, 'Product not found', 'not_found');
    const related = await Product.find({
      _id: { $ne: product._id },
      isActive: true,
      scentFamily: product.scentFamily,
    })
      .limit(4)
      .populate('scentFamily')
      .lean();
    res.json(related.map((d) => toProductDTO(d)));
  } catch (err) {
    next(err);
  }
});
```

- [ ] **Step 5: Mount the router in `app.ts`**

```ts
// apps/api/src/app.ts — add the import and mount it BEFORE notFound
import { catalogRouter } from './routes/catalog';
// ...
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', catalogRouter);

  app.use('/api', notFound);
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test --workspace apps/api`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/api
git commit -m "feat(api): public catalog read endpoints (products, scent-families, related)"
```

---

### Task 4: Settings + User models, Cloudinary helper, and seed script

**Files:**
- Create: `apps/api/src/models/Setting.ts`
- Create: `apps/api/src/models/User.ts`
- Create: `apps/api/src/lib/cloudinary.ts`
- Create: `apps/api/src/routes/settings.ts`
- Create: `apps/api/src/routes/settings.test.ts`
- Create: `apps/api/src/seed.ts`
- Modify: `apps/api/src/app.ts` (mount settings route)
- Modify: `apps/api/src/config/env.ts` (add `ADMIN_TOKEN`)
- Modify: `apps/api/package.json` (add `bcryptjs`, `cloudinary`, `@types/bcryptjs`; add `seed` script)

**Interfaces:**
- Consumes: `Product`, `ScentFamily` models; `slugify`.
- Produces:
  - `Setting` model (singleton shape from `docs/04_DATABASE.md`); `User` model (minimal: name/email/passwordHash/role).
  - `cloudinary.ts`: `isCloudinaryConfigured(): boolean`, `signUploadParams(folder: string): { timestamp, signature, apiKey, cloudName, folder }`.
  - `settingsRouter` at `/api`: `GET /api/settings` → public settings subset.
  - `npm run seed --workspace apps/api` populates admin user, 3 scent families, 4 perfumes, 2 bundles, default Setting.
  - `env.ADMIN_TOKEN: string` (min length 16).

- [ ] **Step 1: Add dependencies and seed script**

```bash
npm install bcryptjs cloudinary --workspace apps/api
npm install -D @types/bcryptjs --workspace apps/api
```

Then add to `apps/api/package.json` scripts: `"seed": "tsx src/seed.ts"`.

- [ ] **Step 2: Add `ADMIN_TOKEN` to env schema**

```ts
// apps/api/src/config/env.ts — add inside envSchema object
  ADMIN_TOKEN: z.string().min(16),
```

- [ ] **Step 3: Implement Setting and User models**

```ts
// apps/api/src/models/Setting.ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const settingSchema = new Schema(
  {
    whatsappNumber: { type: String, required: true },
    shippingFee: { type: Number, required: true, default: 0 },
    freeShippingThreshold: { type: Number },
    socialLinks: { instagram: String, facebook: String, tiktok: String },
    hero: {
      title: { type: String, required: true },
      subtitle: { type: String, required: true },
      ctaText: { type: String, required: true },
      ctaLink: { type: String, required: true },
      image: { type: String, required: true },
    },
    contactEmail: { type: String },
  },
  { timestamps: true },
);

export type SettingDoc = InferSchemaType<typeof settingSchema>;
export const Setting = mongoose.models.Setting ?? mongoose.model('Setting', settingSchema);
```

```ts
// apps/api/src/models/User.ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    phone: { type: String },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User = mongoose.models.User ?? mongoose.model('User', userSchema);
```

- [ ] **Step 4: Implement the Cloudinary helper**

```ts
// apps/api/src/lib/cloudinary.ts
import { v2 as cloudinary } from 'cloudinary';

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

export function isCloudinaryConfigured(): boolean {
  return Boolean(cloudName && apiKey && apiSecret);
}

export function signUploadParams(folder: string) {
  if (!isCloudinaryConfigured()) throw new Error('Cloudinary is not configured');
  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request({ timestamp, folder }, apiSecret!);
  return { timestamp, signature, apiKey: apiKey!, cloudName: cloudName!, folder };
}
```

- [ ] **Step 5: Write the failing settings route test**

```ts
// apps/api/src/routes/settings.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { Setting } from '../models/Setting';

const app = createApp({ clientOrigin: 'http://localhost:5173' });

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

describe('GET /api/settings', () => {
  it('returns the public settings subset', async () => {
    await Setting.create({
      whatsappNumber: '+201234567890',
      shippingFee: 60,
      hero: { title: 'H', subtitle: 'S', ctaText: 'Shop', ctaLink: '/products', image: 'herencia/hero' },
    });
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.whatsappNumber).toBe('+201234567890');
    expect(res.body.hero.title).toBe('H');
  });
  it('returns 404 when settings are not seeded', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test --workspace apps/api`
Expected: FAIL — `Cannot find module './routes/settings'`.

- [ ] **Step 7: Implement the settings route and mount it**

```ts
// apps/api/src/routes/settings.ts
import { Router } from 'express';
import { Setting } from '../models/Setting';
import { HttpError } from '../middleware/error';

export const settingsRouter = Router();

settingsRouter.get('/settings', async (_req, res, next) => {
  try {
    const s = await Setting.findOne().lean();
    if (!s) throw new HttpError(404, 'Settings not configured', 'not_found');
    res.json({
      whatsappNumber: s.whatsappNumber,
      shippingFee: s.shippingFee,
      freeShippingThreshold: s.freeShippingThreshold ?? undefined,
      socialLinks: s.socialLinks ?? {},
      hero: s.hero,
      contactEmail: s.contactEmail ?? undefined,
    });
  } catch (err) {
    next(err);
  }
});
```

```ts
// apps/api/src/app.ts — add import and mount alongside catalogRouter
import { settingsRouter } from './routes/settings';
// ...
  app.use('/api', catalogRouter);
  app.use('/api', settingsRouter);
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npm run test --workspace apps/api`
Expected: PASS.

- [ ] **Step 9: Implement the seed script**

```ts
// apps/api/src/seed.ts
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { loadEnv } from './config/env';
import { ScentFamily } from './models/ScentFamily';
import { Product } from './models/Product';
import { Setting } from './models/Setting';
import { User } from './models/User';

async function seed() {
  const env = loadEnv(process.env);
  await mongoose.connect(env.MONGODB_URI);
  console.log('Connected. Clearing catalog collections...');
  await Promise.all([
    ScentFamily.deleteMany({}),
    Product.deleteMany({}),
    Setting.deleteMany({}),
    User.deleteMany({ role: 'admin' }),
  ]);

  const [woody, floral, oriental] = await ScentFamily.create([
    { name: 'Woody', slug: 'woody', order: 1, description: 'Warm cedar, oud, and sandalwood.' },
    { name: 'Floral', slug: 'floral', order: 2, description: 'Rose, jasmine, and peony.' },
    { name: 'Oriental', slug: 'oriental', order: 3, description: 'Amber, spice, and incense.' },
  ]);

  const perfumes = await Product.create([
    {
      name: 'Royal Oud', type: 'perfume', shortDesc: 'A regal oud with smoky depth.',
      description: 'Royal Oud opens with bergamot before settling into a heart of rose and a base of aged oud and sandalwood.',
      images: ['herencia/royal-oud'], sizes: [{ label: '50ml', price: 1200, stock: 12 }, { label: '100ml', price: 1900, stock: 8 }],
      scentFamily: woody._id, notes: { top: ['Bergamot'], heart: ['Rose'], base: ['Oud', 'Sandalwood'] },
      gender: 'unisex', concentration: 'EDP', isFeatured: true, rating: { avg: 4.7, count: 23 },
    },
    {
      name: 'Rose Veil', type: 'perfume', shortDesc: 'A luminous, dewy rose.',
      description: 'Rose Veil layers Damascus rose over peony and a soft musk drydown.',
      images: ['herencia/rose-veil'], sizes: [{ label: '50ml', price: 950, stock: 15 }],
      scentFamily: floral._id, notes: { top: ['Pink Pepper'], heart: ['Damascus Rose', 'Peony'], base: ['White Musk'] },
      gender: 'women', concentration: 'EDP', isFeatured: true, rating: { avg: 4.5, count: 18 },
    },
    {
      name: 'Amber Noir', type: 'perfume', shortDesc: 'Spiced amber for the evening.',
      description: 'Amber Noir is a warm, resinous amber wrapped in incense and vanilla.',
      images: ['herencia/amber-noir'], sizes: [{ label: '50ml', price: 1100, stock: 10 }, { label: '100ml', price: 1750, stock: 5 }],
      scentFamily: oriental._id, notes: { top: ['Saffron'], heart: ['Incense'], base: ['Amber', 'Vanilla'] },
      gender: 'men', concentration: 'Extrait', isFeatured: false, rating: { avg: 4.8, count: 31 },
    },
    {
      name: 'Cedar Smoke', type: 'perfume', shortDesc: 'Dry cedar and vetiver.',
      description: 'Cedar Smoke is a crisp, woody composition built on cedar, vetiver, and a whisper of leather.',
      images: ['herencia/cedar-smoke'], sizes: [{ label: '50ml', price: 880, stock: 20 }],
      scentFamily: woody._id, notes: { top: ['Cardamom'], heart: ['Cedar'], base: ['Vetiver', 'Leather'] },
      gender: 'unisex', concentration: 'EDT', isFeatured: false, rating: { avg: 4.3, count: 9 },
    },
  ]);

  await Product.create([
    {
      name: 'Heritage Trio', type: 'bundle', shortDesc: 'Three signature scents, curated.',
      description: 'A discovery set pairing Royal Oud, Rose Veil, and Amber Noir.',
      images: ['herencia/heritage-trio'], sizes: [{ label: 'Set', price: 2900, compareAtPrice: 3250, stock: 6 }],
      scentFamily: woody._id, notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'Other',
      isFeatured: true, rating: { avg: 4.9, count: 7 },
      bundleItems: [
        { product: perfumes[0]!._id, qty: 1 },
        { product: perfumes[1]!._id, qty: 1 },
        { product: perfumes[2]!._id, qty: 1 },
      ],
    },
    {
      name: 'Woody Duo', type: 'bundle', shortDesc: 'Two woods, one gift box.',
      description: 'Royal Oud and Cedar Smoke together at a bundle price.',
      images: ['herencia/woody-duo'], sizes: [{ label: 'Set', price: 1900, compareAtPrice: 2080, stock: 9 }],
      scentFamily: woody._id, notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'Other',
      isFeatured: false, rating: { avg: 4.6, count: 4 },
      bundleItems: [
        { product: perfumes[0]!._id, qty: 1 },
        { product: perfumes[3]!._id, qty: 1 },
      ],
    },
  ]);

  await Setting.create({
    whatsappNumber: env.WHATSAPP_NUMBER ?? '+200000000000',
    shippingFee: 60, freeShippingThreshold: 2000,
    socialLinks: { instagram: 'https://instagram.com/herencia' },
    hero: {
      title: 'Luxury in every drop', subtitle: 'Heritage perfumery, crafted for the modern connoisseur.',
      ctaText: 'Shop the collection', ctaLink: '/products', image: 'herencia/hero',
    },
    contactEmail: 'hello@herencia.example',
  });

  const passwordHash = await bcrypt.hash('admin1234', 10);
  await User.create({ name: 'HERENCIA Admin', email: 'admin@herencia.example', passwordHash, role: 'admin' });

  console.log('Seed complete: 3 families, 4 perfumes, 2 bundles, settings, admin user (admin@herencia.example / admin1234).');
  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed', err);
  process.exit(1);
});
```

- [ ] **Step 10: Verify the seed runs against the configured DB**

Run: `npm run seed --workspace apps/api`
Expected: console prints "Seed complete...". (Requires `.env` with `MONGODB_URI` + `ADMIN_TOKEN`. If `ADMIN_TOKEN` is missing, add a 16+ char value to `.env` first.)

- [ ] **Step 11: Commit**

```bash
git add apps/api
git commit -m "feat(api): Setting/User models, Cloudinary helper, public settings, seed script"
```

---

### Task 5: Interim admin guard + admin catalog CRUD + image upload signing

**Files:**
- Create: `apps/api/src/middleware/requireAdmin.ts`
- Create: `apps/api/src/routes/admin.ts`
- Create: `apps/api/src/routes/admin.test.ts`
- Modify: `apps/api/src/app.ts` (mount admin router; pass admin token)

**Interfaces:**
- Consumes: `adminProductSchema`, `scentFamilySchema`, `slugify` from `@herencia/shared`; `Product`, `ScentFamily` models; `signUploadParams`, `isCloudinaryConfigured`; `HttpError`; `toProductDTO`, `toScentFamilyDTO`.
- Produces:
  - `requireAdmin(token: string)` → Express middleware; rejects with 401 unless `req.header('x-admin-token') === token`. **Interim — M2 replaces internals with JWT cookie + role check.**
  - `adminRouter(opts: { adminToken: string })` mounted at `/api/admin`:
    - `POST /api/admin/scent-families`, `PUT /api/admin/scent-families/:id`, `DELETE /api/admin/scent-families/:id`.
    - `POST /api/admin/products`, `PUT /api/admin/products/:id`, `DELETE /api/admin/products/:id` (handles `type: bundle`).
    - `POST /api/admin/uploads/sign` → `{ timestamp, signature, apiKey, cloudName, folder }` (503 if Cloudinary unconfigured).
- `createApp` signature changes to `createApp(opts: { clientOrigin: string; adminToken?: string })` — default token for tests is `'test-admin-token-1234'`.

- [ ] **Step 1: Write the failing admin test**

```ts
// apps/api/src/routes/admin.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';

const TOKEN = 'test-admin-token-1234';
const app = createApp({ clientOrigin: 'http://localhost:5173', adminToken: TOKEN });

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

function validProduct(scentFamily: string) {
  return {
    name: 'Royal Oud', type: 'perfume', shortDesc: 'Regal', description: 'Long',
    images: ['herencia/royal-oud'], sizes: [{ label: '50ml', price: 1200, stock: 5 }],
    scentFamily, notes: { top: ['Bergamot'], heart: ['Rose'], base: ['Oud'] },
    gender: 'unisex', concentration: 'EDP',
  };
}

describe('admin auth guard', () => {
  it('rejects requests without the admin token', async () => {
    const res = await request(app).post('/api/admin/scent-families').send({ name: 'Woody' });
    expect(res.status).toBe(401);
  });
});

describe('admin scent-families', () => {
  it('creates a family with the token', async () => {
    const res = await request(app).post('/api/admin/scent-families').set('x-admin-token', TOKEN).send({ name: 'Woody' });
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('woody');
  });
});

describe('admin products', () => {
  it('creates, updates, and deletes a product', async () => {
    const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    const create = await request(app).post('/api/admin/products').set('x-admin-token', TOKEN).send(validProduct(String(fam._id)));
    expect(create.status).toBe(201);
    expect(create.body.basePrice).toBe(1200);
    const id = create.body.id;

    const update = await request(app).put(`/api/admin/products/${id}`).set('x-admin-token', TOKEN)
      .send({ ...validProduct(String(fam._id)), name: 'Royal Oud Reserve' });
    expect(update.status).toBe(200);
    expect(update.body.name).toBe('Royal Oud Reserve');

    const del = await request(app).delete(`/api/admin/products/${id}`).set('x-admin-token', TOKEN);
    expect(del.status).toBe(204);
    expect(await Product.countDocuments()).toBe(0);
  });

  it('rejects an invalid product with 400', async () => {
    const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    const res = await request(app).post('/api/admin/products').set('x-admin-token', TOKEN)
      .send({ ...validProduct(String(fam._id)), sizes: [] });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api`
Expected: FAIL — `createApp` has no `adminToken`; admin router missing.

- [ ] **Step 3: Implement the requireAdmin middleware**

```ts
// apps/api/src/middleware/requireAdmin.ts
import type { NextFunction, Request, Response } from 'express';
import { HttpError } from './error';

// INTERIM (Milestone 1): header-token guard. Milestone 2 replaces the body of this
// middleware with JWT httpOnly-cookie verification + role check. Route definitions stay.
export function requireAdmin(token: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (req.header('x-admin-token') !== token) {
      return next(new HttpError(401, 'Admin authorization required', 'unauthorized'));
    }
    next();
  };
}
```

- [ ] **Step 4: Implement the admin router**

```ts
// apps/api/src/routes/admin.ts
import { Router } from 'express';
import { adminProductSchema, scentFamilySchema, slugify } from '@herencia/shared';
import { Product } from '../models/Product';
import { ScentFamily } from '../models/ScentFamily';
import { HttpError } from '../middleware/error';
import { requireAdmin } from '../middleware/requireAdmin';
import { isCloudinaryConfigured, signUploadParams } from '../lib/cloudinary';
import { toProductDTO, toScentFamilyDTO } from '../lib/serialize';

export function adminRouter(opts: { adminToken: string }): Router {
  const router = Router();
  router.use(requireAdmin(opts.adminToken));

  // ---- Scent families ----
  router.post('/scent-families', async (req, res, next) => {
    try {
      const parsed = scentFamilySchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const doc = await ScentFamily.create({ ...data, slug: data.slug ?? slugify(data.name) });
      res.status(201).json(toScentFamilyDTO(doc.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.put('/scent-families/:id', async (req, res, next) => {
    try {
      const parsed = scentFamilySchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const doc = await ScentFamily.findByIdAndUpdate(
        req.params.id,
        { ...data, slug: data.slug ?? slugify(data.name) },
        { new: true },
      ).lean();
      if (!doc) throw new HttpError(404, 'Scent family not found', 'not_found');
      res.json(toScentFamilyDTO(doc));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/scent-families/:id', async (req, res, next) => {
    try {
      const inUse = await Product.countDocuments({ scentFamily: req.params.id });
      if (inUse > 0) throw new HttpError(409, 'Scent family is in use by products', 'conflict');
      const doc = await ScentFamily.findByIdAndDelete(req.params.id).lean();
      if (!doc) throw new HttpError(404, 'Scent family not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Products / bundles ----
  router.post('/products', async (req, res, next) => {
    try {
      const parsed = adminProductSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const doc = await Product.create({ ...data, slug: data.slug ?? slugify(data.name) });
      const populated = await doc.populate('scentFamily');
      res.status(201).json(toProductDTO(populated.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.put('/products/:id', async (req, res, next) => {
    try {
      const parsed = adminProductSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const data = parsed.data;
      const doc = await Product.findById(req.params.id);
      if (!doc) throw new HttpError(404, 'Product not found', 'not_found');
      doc.set({ ...data, slug: data.slug ?? slugify(data.name) });
      await doc.save(); // re-runs pre('validate') → basePrice/slug
      const populated = await doc.populate('scentFamily');
      res.json(toProductDTO(populated.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/products/:id', async (req, res, next) => {
    try {
      const doc = await Product.findByIdAndDelete(req.params.id).lean();
      if (!doc) throw new HttpError(404, 'Product not found', 'not_found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  // ---- Cloudinary signed upload ----
  router.post('/uploads/sign', (req, res, next) => {
    try {
      if (!isCloudinaryConfigured()) throw new HttpError(503, 'Image uploads are not configured', 'unconfigured');
      res.json(signUploadParams('herencia'));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
```

- [ ] **Step 5: Wire `createApp` to accept and mount the admin router**

```ts
// apps/api/src/app.ts — updated signature + mount
import { adminRouter } from './routes/admin';
// ...
export function createApp(opts: { clientOrigin: string; adminToken?: string }): Express {
  // ...existing middleware...
  app.use('/api', catalogRouter);
  app.use('/api', settingsRouter);
  app.use('/api/admin', adminRouter({ adminToken: opts.adminToken ?? 'test-admin-token-1234' }));

  app.use('/api', notFound);
  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 6: Pass the real token in `server.ts`**

```ts
// apps/api/src/server.ts — update createApp call
  const app = createApp({ clientOrigin: env.CLIENT_ORIGIN, adminToken: env.ADMIN_TOKEN });
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm run test --workspace apps/api`
Expected: PASS (all API suites).

- [ ] **Step 8: Commit**

```bash
git add apps/api
git commit -m "feat(api): interim admin guard + scent-family/product CRUD + upload signing"
```

---

### Task 6: SSR-lite SEO — meta injection, sitemap, robots, SPA serving

**Files:**
- Create: `apps/api/src/lib/seo.ts`
- Create: `apps/api/src/middleware/spa.ts`
- Create: `apps/api/src/lib/seo.test.ts`
- Create: `apps/api/src/middleware/spa.test.ts`
- Modify: `apps/api/src/app.ts` (sitemap/robots routes + SPA fallback; accept `webDist`)
- Modify: `apps/api/src/server.ts` (pass `webDist` path)

**Interfaces:**
- Consumes: `Product` model; `ProductDTO`; `toProductDTO`.
- Produces:
  - `seo.ts`: `buildHeadTags(meta: RouteMeta): string` (returns the `<title>`/meta/OG/canonical/JSON-LD string), `routeMetaForPath(path: string): Promise<RouteMeta>` (looks up product/bundle for detail routes; static map otherwise), `productJsonLd(p: ProductDTO, canonical: string)`, `buildSitemap(origin, products): string`, `ROBOTS_TXT`.
  - `RouteMeta = { title: string; description: string; canonicalPath: string; image?: string; jsonLd?: string }`.
  - `spaMiddleware(opts: { webDist: string; origin: string })` → serves static assets and injects head into `index.html` for non-`/api` routes.
- `createApp` gains optional `webDist?: string`; when set, mounts SEO routes + SPA fallback.

- [ ] **Step 1: Write the failing seo unit test**

```ts
// apps/api/src/lib/seo.test.ts
import { describe, it, expect } from 'vitest';
import { buildHeadTags, buildSitemap, ROBOTS_TXT } from './seo';

describe('buildHeadTags', () => {
  it('escapes and includes title, description, canonical', () => {
    const html = buildHeadTags({
      title: 'Royal Oud — HERENCIA',
      description: 'A regal oud & rose.',
      canonicalPath: '/products/royal-oud',
    });
    expect(html).toContain('<title>Royal Oud — HERENCIA</title>');
    expect(html).toContain('A regal oud &amp; rose.');
    expect(html).toContain('rel="canonical"');
    expect(html).toContain('og:title');
  });
});

describe('buildSitemap', () => {
  it('lists static routes and product urls', () => {
    const xml = buildSitemap('https://herencia.example', [{ slug: 'royal-oud', type: 'perfume' }]);
    expect(xml).toContain('<loc>https://herencia.example/</loc>');
    expect(xml).toContain('<loc>https://herencia.example/products/royal-oud</loc>');
  });
});

describe('ROBOTS_TXT', () => {
  it('disallows /admin and references the sitemap', () => {
    expect(ROBOTS_TXT).toContain('Disallow: /admin');
    expect(ROBOTS_TXT).toContain('Sitemap:');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api`
Expected: FAIL — `Cannot find module './seo'`.

- [ ] **Step 3: Implement the SEO library**

```ts
// apps/api/src/lib/seo.ts
import type { ProductDTO } from '@herencia/shared';
import { Product } from '../models/Product';
import { toProductDTO } from './serialize';

export type RouteMeta = {
  title: string;
  description: string;
  canonicalPath: string;
  image?: string;
  jsonLd?: string;
};

const BRAND = 'HERENCIA';
const DEFAULT_DESC = 'Heritage luxury perfumery. Luxury in every drop.';

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const STATIC_META: Record<string, { title: string; description: string }> = {
  '/': { title: `${BRAND} — Luxury in every drop`, description: DEFAULT_DESC },
  '/products': { title: `Shop Perfumes — ${BRAND}`, description: 'Browse the HERENCIA perfume collection.' },
  '/bundles': { title: `Bundles — ${BRAND}`, description: 'Curated HERENCIA perfume bundles.' },
  '/about': { title: `About — ${BRAND}`, description: 'The HERENCIA story.' },
  '/contact': { title: `Contact — ${BRAND}`, description: 'Get in touch with HERENCIA.' },
};

export function productJsonLd(p: ProductDTO, canonical: string): string {
  const offer = {
    '@type': 'Offer',
    price: p.basePrice,
    priceCurrency: 'EGP',
    availability:
      p.sizes.some((s) => s.stock > 0) ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    url: canonical,
  };
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.shortDesc,
    brand: { '@type': 'Brand', name: BRAND },
    offers: offer,
  };
  if (p.rating.count > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: p.rating.avg,
      reviewCount: p.rating.count,
    };
  }
  return JSON.stringify(data);
}

export async function routeMetaForPath(path: string): Promise<RouteMeta> {
  const clean = path.split('?')[0]!.replace(/\/+$/, '') || '/';

  const detail = clean.match(/^\/(products|bundles)\/([^/]+)$/);
  if (detail) {
    const slug = detail[2]!;
    const doc = await Product.findOne({ slug, isActive: true }).lean();
    if (doc) {
      const dto = toProductDTO(doc);
      const canonical = `/${detail[1]}/${slug}`;
      return {
        title: dto.seo.title ?? `${dto.name} — ${BRAND}`,
        description: dto.seo.description ?? dto.shortDesc,
        canonicalPath: canonical,
        image: dto.images[0],
        jsonLd: productJsonLd(dto, canonical),
      };
    }
  }

  const stat = STATIC_META[clean];
  if (stat) return { ...stat, canonicalPath: clean };
  return { title: `${BRAND} — Luxury in every drop`, description: DEFAULT_DESC, canonicalPath: clean };
}

export function buildHeadTags(meta: RouteMeta, origin = ''): string {
  const url = `${origin}${meta.canonicalPath}`;
  const desc = escapeHtml(meta.description);
  const title = escapeHtml(meta.title);
  const parts = [
    `<title>${title}</title>`,
    `<meta name="description" content="${desc}" />`,
    `<link rel="canonical" href="${url}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${title}" />`,
    `<meta property="og:description" content="${desc}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
  ];
  if (meta.image) parts.push(`<meta property="og:image" content="${escapeHtml(meta.image)}" />`);
  if (meta.jsonLd) parts.push(`<script type="application/ld+json">${meta.jsonLd}</script>`);
  return parts.join('\n    ');
}

export function buildSitemap(origin: string, products: { slug: string; type: string }[]): string {
  const staticPaths = ['/', '/products', '/bundles', '/about', '/contact'];
  const urls = [
    ...staticPaths.map((p) => `${origin}${p}`),
    ...products.map((p) => `${origin}/${p.type === 'bundle' ? 'bundles' : 'products'}/${p.slug}`),
  ];
  const body = urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export const ROBOTS_TXT = ['User-agent: *', 'Allow: /', 'Disallow: /admin', 'Sitemap: /sitemap.xml', ''].join('\n');
```

- [ ] **Step 4: Write the failing SPA-injection integration test**

```ts
// apps/api/src/middleware/spa.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';

const dist = mkdtempSync(join(tmpdir(), 'webdist-'));
writeFileSync(
  join(dist, 'index.html'),
  '<!doctype html><html><head><title>HERENCIA</title></head><body><div id="root"></div></body></html>',
);
const app = createApp({ clientOrigin: 'http://localhost:5173', webDist: dist, origin: 'https://herencia.example' });

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

describe('SPA + SEO injection', () => {
  it('injects product meta into index.html on a detail route', async () => {
    const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    await Product.create({
      name: 'Royal Oud', type: 'perfume', shortDesc: 'A regal oud.', description: 'd', images: ['herencia/royal-oud'],
      sizes: [{ label: '50ml', price: 1200, stock: 5 }], scentFamily: fam._id,
      notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
    });
    const res = await request(app).get('/products/royal-oud');
    expect(res.status).toBe(200);
    expect(res.text).toContain('<title>Royal Oud — HERENCIA</title>');
    expect(res.text).toContain('application/ld+json');
    expect(res.text).toContain('<div id="root">');
  });

  it('serves robots.txt and sitemap.xml', async () => {
    const robots = await request(app).get('/robots.txt');
    expect(robots.status).toBe(200);
    expect(robots.text).toContain('Disallow: /admin');
    const sitemap = await request(app).get('/sitemap.xml');
    expect(sitemap.status).toBe(200);
    expect(sitemap.text).toContain('<urlset');
  });

  it('still returns JSON 404 for unknown api routes', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body.error).toBeDefined();
  });
});
```

- [ ] **Step 5: Run test to verify it fails**

Run: `npm run test --workspace apps/api`
Expected: FAIL — `createApp` ignores `webDist`; no SPA middleware.

- [ ] **Step 6: Implement the SPA middleware**

```ts
// apps/api/src/middleware/spa.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import express, { type Express } from 'express';
import { buildHeadTags, routeMetaForPath } from '../lib/seo';

// Mounts static asset serving + an HTML fallback that injects per-route <head>.
export function mountSpa(app: Express, opts: { webDist: string; origin: string }) {
  // Static assets (hashed files) served directly; index disabled so the fallback runs.
  app.use(express.static(opts.webDist, { index: false }));

  const template = readFileSync(join(opts.webDist, 'index.html'), 'utf8');

  app.get('*', async (req, res, next) => {
    try {
      if (req.path.startsWith('/api')) return next();
      const meta = await routeMetaForPath(req.path);
      const head = buildHeadTags(meta, opts.origin);
      // Replace the template <title> (and everything we manage) by inserting before </head>.
      const withoutTitle = template.replace(/<title>.*?<\/title>/s, '');
      const html = withoutTitle.replace('</head>', `    ${head}\n  </head>`);
      res.status(200).type('html').send(html);
    } catch (err) {
      next(err);
    }
  });
}
```

- [ ] **Step 7: Wire SEO routes + SPA fallback into `app.ts`**

```ts
// apps/api/src/app.ts — final shape
import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler, notFound } from './middleware/error';
import { catalogRouter } from './routes/catalog';
import { settingsRouter } from './routes/settings';
import { adminRouter } from './routes/admin';
import { buildSitemap, ROBOTS_TXT } from './lib/seo';
import { mountSpa } from './middleware/spa';
import { Product } from './models/Product';

export function createApp(opts: {
  clientOrigin: string;
  adminToken?: string;
  webDist?: string;
  origin?: string;
}): Express {
  const app = express();
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: opts.clientOrigin, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', catalogRouter);
  app.use('/api', settingsRouter);
  app.use('/api/admin', adminRouter({ adminToken: opts.adminToken ?? 'test-admin-token-1234' }));
  app.use('/api', notFound);

  const origin = opts.origin ?? '';
  app.get('/robots.txt', (_req, res) => res.type('text/plain').send(ROBOTS_TXT.replace('/sitemap.xml', `${origin}/sitemap.xml`)));
  app.get('/sitemap.xml', async (_req, res, next) => {
    try {
      const products = await Product.find({ isActive: true }).select('slug type').lean();
      res.type('application/xml').send(buildSitemap(origin, products.map((p) => ({ slug: p.slug, type: p.type }))));
    } catch (err) {
      next(err);
    }
  });

  if (opts.webDist) mountSpa(app, { webDist: opts.webDist, origin });

  app.use(errorHandler);
  return app;
}
```

- [ ] **Step 8: Pass `webDist`/`origin` from `server.ts`**

```ts
// apps/api/src/server.ts — updated main()
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { createApp } from './app';
import { loadEnv } from './config/env';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const env = loadEnv(process.env);
  await mongoose.connect(env.MONGODB_URI);
  const webDist = path.resolve(__dirname, '../../web/dist');
  const app = createApp({
    clientOrigin: env.CLIENT_ORIGIN,
    adminToken: env.ADMIN_TOKEN,
    webDist,
    origin: env.CLIENT_ORIGIN,
  });
  app.listen(env.PORT, () => console.log(`API listening on :${env.PORT}`));
}

main().catch((err) => {
  console.error('Failed to start API', err);
  process.exit(1);
});
```

- [ ] **Step 9: Run tests to verify they pass**

Run: `npm run test --workspace apps/api`
Expected: PASS (all API suites).

- [ ] **Step 10: Commit**

```bash
git add apps/api
git commit -m "feat(api): SSR-lite SEO meta injection, sitemap, robots, SPA serving"
```

---

### Task 7: Web app infrastructure — Router, React Query, API client, SEO hook

**Files:**
- Create: `apps/web/src/lib/api.ts`
- Create: `apps/web/src/lib/api.test.ts`
- Create: `apps/web/src/lib/cloudinary.ts`
- Create: `apps/web/src/lib/useSeo.ts`
- Create: `apps/web/src/app/queryClient.ts`
- Create: `apps/web/src/app/router.tsx`
- Create: `apps/web/src/app/StorefrontLayout.tsx`
- Create: `apps/web/src/pages/NotFound.tsx`
- Modify: `apps/web/src/main.tsx`
- Modify: `apps/web/package.json` (add `@tanstack/react-query`, `react-hook-form`)

**Interfaces:**
- Consumes: DTO types from `@herencia/shared`.
- Produces:
  - `api.ts`: `apiGet<T>(path: string): Promise<T>`, `apiSend<T>(method, path, body?, headers?): Promise<T>`, and typed helpers `fetchProducts(query)`, `fetchProduct(slug)`, `fetchRelated(slug)`, `fetchScentFamilies()`, `fetchSettings()`. Throws `ApiError { status, message }`.
  - `cloudinary.ts`: `cld(publicId: string, opts?: { w?: number }): string`, `cldSrcSet(publicId: string): string`.
  - `useSeo(meta: { title: string; description?: string })`: sets `document.title` + meta description on mount (client parity).
  - `queryClient.ts`: a configured `QueryClient`.
  - `router.tsx`: `createRouter()` returning a React Router `RouterProvider`-ready router with code-split routes and `StorefrontLayout`.

- [ ] **Step 1: Add web dependencies**

```bash
npm install @tanstack/react-query react-hook-form --workspace apps/web
```

- [ ] **Step 2: Write the failing API client test**

```ts
// apps/web/src/lib/api.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { apiGet, ApiError } from './api';

afterEach(() => vi.restoreAllMocks());

describe('apiGet', () => {
  it('returns parsed JSON on success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 })));
    await expect(apiGet('/api/x')).resolves.toEqual({ ok: 1 });
  });
  it('throws ApiError with status on failure', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Nope' } }), { status: 404 })));
    await expect(apiGet('/api/x')).rejects.toMatchObject({ status: 404, message: 'Nope' } satisfies Partial<ApiError>);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm run test --workspace apps/web`
Expected: FAIL — `Cannot find module './api'`.

- [ ] **Step 4: Implement the API client**

```ts
// apps/web/src/lib/api.ts
import type { ProductDTO, ProductListDTO, ScentFamilyDTO } from '@herencia/shared';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseError(res: Response): Promise<never> {
  let message = res.statusText;
  try {
    const body = await res.json();
    message = body?.error?.message ?? message;
  } catch {
    /* non-JSON error body */
  }
  throw new ApiError(res.status, message);
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(path, { credentials: 'include' });
  if (!res.ok) return parseError(res);
  return res.json() as Promise<T>;
}

export async function apiSend<T>(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
  headers: Record<string, string> = {},
): Promise<T> {
  const res = await fetch(path, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body == null ? undefined : JSON.stringify(body),
  });
  if (!res.ok) return parseError(res);
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export type ProductFilters = {
  q?: string;
  type?: 'perfume' | 'bundle';
  scentFamily?: string;
  gender?: string;
  concentration?: string;
  minPrice?: number;
  maxPrice?: number;
  sort?: string;
  page?: number;
};

export function fetchProducts(filters: ProductFilters): Promise<ProductListDTO> {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(filters)) {
    if (v !== undefined && v !== '' && v !== null) params.set(k, String(v));
  }
  const qs = params.toString();
  return apiGet<ProductListDTO>(`/api/products${qs ? `?${qs}` : ''}`);
}

export const fetchProduct = (slug: string) => apiGet<ProductDTO>(`/api/products/${slug}`);
export const fetchRelated = (slug: string) => apiGet<ProductDTO[]>(`/api/products/${slug}/related`);
export const fetchScentFamilies = () => apiGet<ScentFamilyDTO[]>('/api/scent-families');
export type PublicSettings = {
  whatsappNumber: string;
  shippingFee: number;
  freeShippingThreshold?: number;
  socialLinks: { instagram?: string; facebook?: string; tiktok?: string };
  hero: { title: string; subtitle: string; ctaText: string; ctaLink: string; image: string };
  contactEmail?: string;
};
export const fetchSettings = () => apiGet<PublicSettings>('/api/settings');
```

- [ ] **Step 5: Implement cloudinary + useSeo helpers**

```ts
// apps/web/src/lib/cloudinary.ts
const CLOUD = (import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined) ?? '';

// Falls back to returning the raw value if it's already a URL or no cloud configured.
export function cld(publicId: string, opts: { w?: number } = {}): string {
  if (!publicId) return '';
  if (/^https?:\/\//.test(publicId) || !CLOUD) return publicId;
  const t = `f_auto,q_auto${opts.w ? `,w_${opts.w}` : ''}`;
  return `https://res.cloudinary.com/${CLOUD}/image/upload/${t}/${publicId}`;
}

export function cldSrcSet(publicId: string): string {
  if (!publicId || /^https?:\/\//.test(publicId) || !CLOUD) return '';
  return [400, 800, 1200].map((w) => `${cld(publicId, { w })} ${w}w`).join(', ');
}
```

```ts
// apps/web/src/lib/useSeo.ts
import { useEffect } from 'react';

export function useSeo(meta: { title: string; description?: string }): void {
  useEffect(() => {
    document.title = meta.title;
    if (meta.description) {
      let tag = document.querySelector('meta[name="description"]');
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute('name', 'description');
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', meta.description);
    }
  }, [meta.title, meta.description]);
}
```

- [ ] **Step 6: Implement the query client, layout, 404, and router**

```ts
// apps/web/src/app/queryClient.ts
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false } },
});
```

```tsx
// apps/web/src/app/StorefrontLayout.tsx
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useTheme } from './ThemeProvider';
import { Button } from '../components/Button';

export function StorefrontLayout() {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-line">
        <nav className="mx-auto flex max-w-6xl items-center justify-between p-4">
          <Link to="/" className="font-display text-xl text-content">HERENCIA</Link>
          <div className="flex items-center gap-4 font-body text-sm">
            <NavLink to="/products" className="text-content hover:text-accent">Perfumes</NavLink>
            <NavLink to="/bundles" className="text-content hover:text-accent">Bundles</NavLink>
            <Button variant="ghost" onClick={toggle} aria-label="Toggle theme">{theme === 'light' ? '🌙' : '☀️'}</Button>
          </div>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 p-4">
        <Outlet />
      </main>
      <footer className="border-t border-line p-6 text-center font-body text-sm text-muted">
        © {new Date().getFullYear()} HERENCIA — Luxury in every drop.
      </footer>
    </div>
  );
}
```

```tsx
// apps/web/src/pages/NotFound.tsx
import { Link } from 'react-router-dom';
import { useSeo } from '../lib/useSeo';

export default function NotFound() {
  useSeo({ title: 'Not found — HERENCIA' });
  return (
    <section className="grid place-items-center gap-4 py-24 text-center">
      <h1 className="font-display text-4xl text-content">404</h1>
      <p className="font-body text-muted">This page drifted away like a top note.</p>
      <Link to="/" className="font-body text-accent underline">Return home</Link>
    </section>
  );
}
```

```tsx
// apps/web/src/app/router.tsx
import { lazy } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { StorefrontLayout } from './StorefrontLayout';

const Home = lazy(() => import('../pages/Home'));
const Products = lazy(() => import('../pages/Products'));
const ProductDetail = lazy(() => import('../pages/ProductDetail'));
const Bundles = lazy(() => import('../pages/Bundles'));
const NotFound = lazy(() => import('../pages/NotFound'));
const Admin = lazy(() => import('../pages/admin/AdminApp'));

export const router = createBrowserRouter([
  {
    element: <StorefrontLayout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/products', element: <Products /> },
      { path: '/products/:slug', element: <ProductDetail /> },
      { path: '/bundles', element: <Bundles /> },
      { path: '/bundles/:slug', element: <ProductDetail /> },
    ],
  },
  { path: '/admin/*', element: <Admin /> },
  { path: '*', element: <NotFound /> },
]);
```

> **Note for the implementer:** `Home`, `Products`, `ProductDetail`, `Bundles`, and `admin/AdminApp` are created in Tasks 8–11. To keep this task independently testable, create **temporary one-line placeholder default-export components** for any not-yet-built page (e.g. `export default function Home() { return null; }`) so the build compiles; later tasks replace them. The API client test (Step 2) is the gating test for this task.

- [ ] **Step 7: Wire `main.tsx` to the router + providers**

```tsx
// apps/web/src/main.tsx
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './app/ThemeProvider';
import { queryClient } from './app/queryClient';
import { router } from './app/router';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <Suspense fallback={<div className="p-8 text-center font-body text-muted">Loading…</div>}>
          <RouterProvider router={router} />
        </Suspense>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 8: Run tests, typecheck, and build**

Run: `npm run test --workspace apps/web && npm run build --workspace apps/web`
Expected: PASS; build succeeds (with placeholder pages). Vite should emit separate chunks for lazy routes.

- [ ] **Step 9: Commit**

```bash
git add apps/web
git commit -m "feat(web): router, React Query, typed API client, SEO + cloudinary helpers"
```

---

### Task 8: Catalog components + Home page

**Files:**
- Create: `apps/web/src/components/Price.tsx`
- Create: `apps/web/src/components/Price.test.tsx`
- Create: `apps/web/src/components/Rating.tsx`
- Create: `apps/web/src/components/ProductImage.tsx`
- Create: `apps/web/src/components/ProductCard.tsx`
- Create: `apps/web/src/components/ProductCard.test.tsx`
- Create: `apps/web/src/components/Skeleton.tsx`
- Create: `apps/web/src/pages/Home.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `ProductDTO` from `@herencia/shared`; `cld`, `cldSrcSet`; `fetchProducts`, `fetchSettings`; `useSeo`.
- Produces:
  - `formatEGP(n: number): string` (exported from `Price.tsx`); `<Price size?>` component.
  - `<Rating avg count />`, `<ProductImage publicId alt />`, `<ProductCard product />`, `<Skeleton />`.
  - `Home` default export: hero (from settings) + featured grid (`fetchProducts({ sort: 'rating' })` filtered to featured client-side, or a dedicated featured fetch).

- [ ] **Step 1: Write the failing Price test**

```tsx
// apps/web/src/components/Price.test.tsx
import { describe, it, expect } from 'vitest';
import { formatEGP } from './Price';

describe('formatEGP', () => {
  it('formats whole numbers with EGP and no decimals', () => {
    expect(formatEGP(1200)).toBe('EGP 1,200');
  });
  it('keeps two decimals when present', () => {
    expect(formatEGP(1200.5)).toBe('EGP 1,200.50');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/web`
Expected: FAIL — `Cannot find module './Price'`.

- [ ] **Step 3: Implement Price**

```tsx
// apps/web/src/components/Price.tsx
export function formatEGP(n: number): string {
  const hasCents = Math.round(n * 100) % 100 !== 0;
  return `EGP ${n.toLocaleString('en-US', {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })}`;
}

export function Price({ value, compareAt }: { value: number; compareAt?: number }) {
  return (
    <span className="font-body">
      <span className="text-content">{formatEGP(value)}</span>
      {compareAt && compareAt > value ? (
        <span className="ml-2 text-muted line-through">{formatEGP(compareAt)}</span>
      ) : null}
    </span>
  );
}
```

- [ ] **Step 4: Implement Rating, ProductImage, Skeleton**

```tsx
// apps/web/src/components/Rating.tsx
export function Rating({ avg, count }: { avg: number; count: number }) {
  if (count === 0) return <span className="font-body text-sm text-muted">No reviews yet</span>;
  const full = Math.round(avg);
  return (
    <span className="font-body text-sm text-accent" aria-label={`Rated ${avg} of 5 from ${count} reviews`}>
      {'★'.repeat(full)}{'☆'.repeat(5 - full)} <span className="text-muted">({count})</span>
    </span>
  );
}
```

```tsx
// apps/web/src/components/ProductImage.tsx
import { cld, cldSrcSet } from '../lib/cloudinary';

export function ProductImage({ publicId, alt, w = 800, className }: { publicId: string; alt: string; w?: number; className?: string }) {
  const srcSet = cldSrcSet(publicId);
  return (
    <img
      src={cld(publicId, { w })}
      {...(srcSet ? { srcSet, sizes: '(max-width: 640px) 100vw, 400px' } : {})}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}
```

```tsx
// apps/web/src/components/Skeleton.tsx
export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-line/40 ${className}`} aria-hidden="true" />;
}
```

- [ ] **Step 5: Write the failing ProductCard test**

```tsx
// apps/web/src/components/ProductCard.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductCard } from './ProductCard';
import type { ProductDTO } from '@herencia/shared';

const product: ProductDTO = {
  id: '1', name: 'Royal Oud', slug: 'royal-oud', type: 'perfume', shortDesc: 'Regal', description: 'd',
  images: ['herencia/royal-oud'], sizes: [{ label: '50ml', price: 1200, stock: 5 }], basePrice: 1200,
  scentFamily: { id: 'f', name: 'Woody', slug: 'woody', order: 1 }, notes: { top: [], heart: [], base: [] },
  gender: 'unisex', concentration: 'EDP', rating: { avg: 4.5, count: 10 }, isFeatured: true, isActive: true, seo: {},
};

describe('ProductCard', () => {
  it('renders name, price, and links to the detail page', () => {
    render(<MemoryRouter><ProductCard product={product} /></MemoryRouter>);
    expect(screen.getByText('Royal Oud')).toBeInTheDocument();
    expect(screen.getByText('EGP 1,200')).toBeInTheDocument();
    expect(screen.getByRole('link')).toHaveAttribute('href', '/products/royal-oud');
  });
  it('links bundles to the /bundles path', () => {
    render(<MemoryRouter><ProductCard product={{ ...product, type: 'bundle', slug: 'woody-duo' }} /></MemoryRouter>);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/bundles/woody-duo');
  });
});
```

- [ ] **Step 6: Run test to verify it fails**

Run: `npm run test --workspace apps/web`
Expected: FAIL — `Cannot find module './ProductCard'`.

- [ ] **Step 7: Implement ProductCard**

```tsx
// apps/web/src/components/ProductCard.tsx
import { Link } from 'react-router-dom';
import type { ProductDTO } from '@herencia/shared';
import { ProductImage } from './ProductImage';
import { Price } from './Price';
import { Rating } from './Rating';

export function ProductCard({ product }: { product: ProductDTO }) {
  const href = `${product.type === 'bundle' ? '/bundles' : '/products'}/${product.slug}`;
  return (
    <Link
      to={href}
      className="group block rounded-lg border border-line bg-surface p-3 transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
    >
      <div className="aspect-square overflow-hidden rounded-md bg-bg">
        <ProductImage publicId={product.images[0] ?? ''} alt={product.name} w={400} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
      </div>
      <h3 className="mt-3 font-display text-lg text-content">{product.name}</h3>
      <p className="font-body text-sm text-muted">{product.scentFamily?.name ?? ''}</p>
      <div className="mt-1"><Rating avg={product.rating.avg} count={product.rating.count} /></div>
      <div className="mt-2"><Price value={product.basePrice} compareAt={product.sizes[0]?.compareAtPrice} /></div>
    </Link>
  );
}
```

- [ ] **Step 8: Implement the Home page**

```tsx
// apps/web/src/pages/Home.tsx
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchProducts, fetchSettings } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { ProductCard } from '../components/ProductCard';
import { ProductImage } from '../components/ProductImage';
import { Skeleton } from '../components/Skeleton';

export default function Home() {
  useSeo({ title: 'HERENCIA — Luxury in every drop', description: 'Heritage luxury perfumery.' });
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings });
  const featured = useQuery({ queryKey: ['products', 'featured'], queryFn: () => fetchProducts({ sort: 'rating', page: 1 }) });
  const featuredItems = (featured.data?.items ?? []).filter((p) => p.isFeatured).slice(0, 4);
  const hero = settings.data?.hero;

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-xl border border-line bg-surface">
        {hero ? (
          <ProductImage publicId={hero.image} alt={hero.title} w={1200} className="h-72 w-full object-cover opacity-60" />
        ) : (
          <Skeleton className="h-72 w-full" />
        )}
        <div className="absolute inset-0 grid place-items-center p-6 text-center">
          <div className="space-y-4">
            <h1 className="font-display text-4xl text-content md:text-5xl">{hero?.title ?? 'Luxury in every drop'}</h1>
            <p className="mx-auto max-w-xl font-body text-muted">{hero?.subtitle ?? ''}</p>
            <Link to={hero?.ctaLink ?? '/products'} className="inline-block rounded-md bg-maroon px-6 py-3 font-body text-cream hover:bg-maroon/90">
              {hero?.ctaText ?? 'Shop the collection'}
            </Link>
          </div>
        </div>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl text-content">Featured</h2>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {featured.isLoading
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)
            : featuredItems.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 9: Run tests + build**

Run: `npm run test --workspace apps/web && npm run build --workspace apps/web`
Expected: PASS; build succeeds.

- [ ] **Step 10: Commit**

```bash
git add apps/web
git commit -m "feat(web): catalog components (Price/Rating/ProductCard) + Home page"
```

---

### Task 9: Products list page (search, filter, sort, pagination)

**Files:**
- Create: `apps/web/src/features/products/useProductFilters.ts`
- Create: `apps/web/src/features/products/useProductFilters.test.ts`
- Create: `apps/web/src/features/products/FilterBar.tsx`
- Create: `apps/web/src/pages/Products.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `fetchProducts`, `fetchScentFamilies`, `ProductFilters`; `useSearchParams` (React Router); `GENDER`, `CONCENTRATION`, `PRODUCT_SORT` from `@herencia/shared`.
- Produces:
  - `useProductFilters()`: reads/writes filters to the URL query string; returns `{ filters, setFilter, reset }`.
  - `parseFiltersFromParams(params: URLSearchParams): ProductFilters` (pure, unit-tested).
  - `<FilterBar families sort ... />`; `Products` default export.

- [ ] **Step 1: Write the failing filter-parser test**

```ts
// apps/web/src/features/products/useProductFilters.test.ts
import { describe, it, expect } from 'vitest';
import { parseFiltersFromParams } from './useProductFilters';

describe('parseFiltersFromParams', () => {
  it('reads known filter keys and coerces numbers', () => {
    const f = parseFiltersFromParams(new URLSearchParams('gender=women&minPrice=100&page=2&sort=price-asc'));
    expect(f).toMatchObject({ gender: 'women', minPrice: 100, page: 2, sort: 'price-asc' });
  });
  it('ignores empty values', () => {
    const f = parseFiltersFromParams(new URLSearchParams('q=&gender='));
    expect(f.q).toBeUndefined();
    expect(f.gender).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/web`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the filter hook + parser**

```ts
// apps/web/src/features/products/useProductFilters.ts
import { useSearchParams } from 'react-router-dom';
import type { ProductFilters } from '../../lib/api';

const NUMERIC = new Set(['minPrice', 'maxPrice', 'page']);
const KEYS = ['q', 'type', 'scentFamily', 'gender', 'concentration', 'minPrice', 'maxPrice', 'sort', 'page'] as const;

export function parseFiltersFromParams(params: URLSearchParams): ProductFilters {
  const out: ProductFilters = {};
  for (const key of KEYS) {
    const raw = params.get(key);
    if (raw == null || raw === '') continue;
    if (NUMERIC.has(key)) {
      const n = Number(raw);
      if (!Number.isNaN(n)) (out as Record<string, unknown>)[key] = n;
    } else {
      (out as Record<string, unknown>)[key] = raw;
    }
  }
  return out;
}

export function useProductFilters() {
  const [params, setParams] = useSearchParams();
  const filters = parseFiltersFromParams(params);

  function setFilter(key: keyof ProductFilters, value: string | number | undefined) {
    const next = new URLSearchParams(params);
    if (value === undefined || value === '') next.delete(key);
    else next.set(key, String(value));
    if (key !== 'page') next.delete('page'); // reset paging on filter change
    setParams(next, { replace: true });
  }

  function reset() {
    setParams(new URLSearchParams(), { replace: true });
  }

  return { filters, setFilter, reset };
}
```

- [ ] **Step 4: Implement the FilterBar**

```tsx
// apps/web/src/features/products/FilterBar.tsx
import { GENDER, CONCENTRATION, PRODUCT_SORT, type ScentFamilyDTO } from '@herencia/shared';
import type { ProductFilters } from '../../lib/api';

export function FilterBar({
  families, filters, onChange, onReset,
}: {
  families: ScentFamilyDTO[];
  filters: ProductFilters;
  onChange: (key: keyof ProductFilters, value: string | number | undefined) => void;
  onReset: () => void;
}) {
  return (
    <div className="mb-6 grid gap-3 rounded-lg border border-line bg-surface p-4 md:grid-cols-3">
      <input
        type="search" placeholder="Search perfumes…" defaultValue={filters.q ?? ''}
        onChange={(e) => onChange('q', e.target.value || undefined)}
        className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content md:col-span-3"
        aria-label="Search perfumes"
      />
      <select aria-label="Scent family" value={filters.scentFamily ?? ''} onChange={(e) => onChange('scentFamily', e.target.value || undefined)} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content">
        <option value="">All scent families</option>
        {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
      <select aria-label="Gender" value={filters.gender ?? ''} onChange={(e) => onChange('gender', e.target.value || undefined)} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content">
        <option value="">All genders</option>
        {GENDER.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>
      <select aria-label="Concentration" value={filters.concentration ?? ''} onChange={(e) => onChange('concentration', e.target.value || undefined)} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content">
        <option value="">All concentrations</option>
        {CONCENTRATION.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      <input type="number" min={0} placeholder="Min EGP" defaultValue={filters.minPrice ?? ''} onChange={(e) => onChange('minPrice', e.target.value ? Number(e.target.value) : undefined)} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content" aria-label="Minimum price" />
      <input type="number" min={0} placeholder="Max EGP" defaultValue={filters.maxPrice ?? ''} onChange={(e) => onChange('maxPrice', e.target.value ? Number(e.target.value) : undefined)} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content" aria-label="Maximum price" />
      <select aria-label="Sort" value={filters.sort ?? 'newest'} onChange={(e) => onChange('sort', e.target.value)} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content">
        {PRODUCT_SORT.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <button onClick={onReset} className="rounded-md border border-gold px-3 py-2 font-body text-sm text-content hover:bg-gold/10 md:col-span-3">Reset filters</button>
    </div>
  );
}
```

- [ ] **Step 5: Implement the Products page**

```tsx
// apps/web/src/pages/Products.tsx
import { useQuery } from '@tanstack/react-query';
import { fetchProducts, fetchScentFamilies } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { useProductFilters } from '../features/products/useProductFilters';
import { FilterBar } from '../features/products/FilterBar';
import { ProductCard } from '../components/ProductCard';
import { Skeleton } from '../components/Skeleton';

export default function Products() {
  useSeo({ title: 'Shop Perfumes — HERENCIA', description: 'Browse the HERENCIA perfume collection.' });
  const { filters, setFilter, reset } = useProductFilters();
  const families = useQuery({ queryKey: ['scent-families'], queryFn: fetchScentFamilies });
  const products = useQuery({
    queryKey: ['products', filters],
    queryFn: () => fetchProducts({ ...filters, type: 'perfume' }),
  });

  const data = products.data;
  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-content">Perfumes</h1>
      <FilterBar families={families.data ?? []} filters={filters} onChange={setFilter} onReset={reset} />

      {products.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}
        </div>
      ) : products.isError ? (
        <p className="font-body text-muted">Could not load products. Please try again.</p>
      ) : data && data.items.length === 0 ? (
        <p className="font-body text-muted">No perfumes match your filters.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
          {data && data.pages > 1 ? (
            <div className="mt-8 flex items-center justify-center gap-4 font-body">
              <button disabled={data.page <= 1} onClick={() => setFilter('page', data.page - 1)} className="rounded-md border border-line px-4 py-2 text-content disabled:opacity-40">Previous</button>
              <span className="text-muted">Page {data.page} of {data.pages}</span>
              <button disabled={data.page >= data.pages} onClick={() => setFilter('page', data.page + 1)} className="rounded-md border border-line px-4 py-2 text-content disabled:opacity-40">Next</button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run tests + build**

Run: `npm run test --workspace apps/web && npm run build --workspace apps/web`
Expected: PASS; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): products list with URL-driven filters, sort, pagination"
```

---

### Task 10: Product detail + Bundles list

**Files:**
- Create: `apps/web/src/features/products/NotesPyramid.tsx`
- Create: `apps/web/src/features/products/Gallery.tsx`
- Create: `apps/web/src/pages/ProductDetail.tsx` (replace placeholder)
- Create: `apps/web/src/pages/ProductDetail.test.tsx`
- Create: `apps/web/src/pages/Bundles.tsx` (replace placeholder)

**Interfaces:**
- Consumes: `fetchProduct`, `fetchRelated`, `fetchProducts`; `useParams`, `useLocation`; `ProductDTO`; `useSeo`; `cld`.
- Produces:
  - `<NotesPyramid notes />`, `<Gallery images alt />`.
  - `ProductDetail` default export (used by `/products/:slug` and `/bundles/:slug`); shows gallery, sizes, notes pyramid, bundle contents (if bundle), related grid.
  - `Bundles` default export: grid of `fetchProducts({ type: 'bundle' })`.

- [ ] **Step 1: Write the failing ProductDetail test**

```tsx
// apps/web/src/pages/ProductDetail.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProductDetail from './ProductDetail';
import type { ProductDTO } from '@herencia/shared';

const product: ProductDTO = {
  id: '1', name: 'Royal Oud', slug: 'royal-oud', type: 'perfume', shortDesc: 'Regal', description: 'A long description.',
  images: ['herencia/royal-oud'], sizes: [{ label: '50ml', price: 1200, stock: 5 }], basePrice: 1200,
  scentFamily: { id: 'f', name: 'Woody', slug: 'woody', order: 1 },
  notes: { top: ['Bergamot'], heart: ['Rose'], base: ['Oud'] },
  gender: 'unisex', concentration: 'EDP', rating: { avg: 4.5, count: 10 }, isFeatured: true, isActive: true, seo: {},
};

afterEach(() => vi.restoreAllMocks());

function renderAt(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes><Route path="/products/:slug" element={<ProductDetail />} /></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('ProductDetail', () => {
  it('renders product name, notes, and price after load', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) =>
      url.endsWith('/related')
        ? new Response(JSON.stringify([]), { status: 200 })
        : new Response(JSON.stringify(product), { status: 200 }),
    ));
    renderAt('/products/royal-oud');
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Royal Oud' })).toBeInTheDocument());
    expect(screen.getByText('Bergamot')).toBeInTheDocument();
    expect(screen.getByText('EGP 1,200')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/web`
Expected: FAIL — module not found / placeholder renders null.

- [ ] **Step 3: Implement NotesPyramid + Gallery**

```tsx
// apps/web/src/features/products/NotesPyramid.tsx
export function NotesPyramid({ notes }: { notes: { top: string[]; heart: string[]; base: string[] } }) {
  const rows: { label: string; items: string[] }[] = [
    { label: 'Top', items: notes.top },
    { label: 'Heart', items: notes.heart },
    { label: 'Base', items: notes.base },
  ];
  if (rows.every((r) => r.items.length === 0)) return null;
  return (
    <dl className="space-y-3">
      {rows.map((r) =>
        r.items.length > 0 ? (
          <div key={r.label} className="flex gap-3">
            <dt className="w-16 shrink-0 font-display text-accent">{r.label}</dt>
            <dd className="font-body text-content">{r.items.join(' · ')}</dd>
          </div>
        ) : null,
      )}
    </dl>
  );
}
```

```tsx
// apps/web/src/features/products/Gallery.tsx
import { useState } from 'react';
import { ProductImage } from '../../components/ProductImage';

export function Gallery({ images, alt }: { images: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const main = images[active] ?? images[0] ?? '';
  return (
    <div>
      <div className="aspect-square overflow-hidden rounded-lg border border-line bg-surface">
        <ProductImage publicId={main} alt={alt} w={1200} className="h-full w-full object-cover" />
      </div>
      {images.length > 1 ? (
        <div className="mt-3 flex gap-2">
          {images.map((img, i) => (
            <button
              key={img + i} onClick={() => setActive(i)} aria-label={`View image ${i + 1}`}
              className={`h-16 w-16 overflow-hidden rounded-md border ${i === active ? 'border-gold' : 'border-line'}`}
            >
              <ProductImage publicId={img} alt={`${alt} thumbnail ${i + 1}`} w={120} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 4: Implement ProductDetail**

```tsx
// apps/web/src/pages/ProductDetail.tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchProduct, fetchRelated } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { Gallery } from '../features/products/Gallery';
import { NotesPyramid } from '../features/products/NotesPyramid';
import { Price } from '../components/Price';
import { Rating } from '../components/Rating';
import { ProductCard } from '../components/ProductCard';
import { Skeleton } from '../components/Skeleton';

export default function ProductDetail() {
  const { slug = '' } = useParams();
  const product = useQuery({ queryKey: ['product', slug], queryFn: () => fetchProduct(slug), enabled: !!slug });
  const related = useQuery({ queryKey: ['product', slug, 'related'], queryFn: () => fetchRelated(slug), enabled: !!slug });
  const [sizeIdx, setSizeIdx] = useState(0);

  useSeo({
    title: product.data ? `${product.data.name} — HERENCIA` : 'HERENCIA',
    description: product.data?.shortDesc,
  });

  if (product.isLoading) return <Skeleton className="h-96 w-full" />;
  if (product.isError || !product.data) return <p className="font-body text-muted">Product not found.</p>;

  const p = product.data;
  const size = p.sizes[sizeIdx] ?? p.sizes[0];

  return (
    <article className="space-y-12">
      <div className="grid gap-8 md:grid-cols-2">
        <Gallery images={p.images} alt={p.name} />
        <div className="space-y-5">
          <div>
            <p className="font-body text-sm uppercase tracking-wide text-accent">{p.scentFamily?.name} · {p.concentration} · {p.gender}</p>
            <h1 className="font-display text-3xl text-content">{p.name}</h1>
            <div className="mt-2"><Rating avg={p.rating.avg} count={p.rating.count} /></div>
          </div>
          <p className="font-body text-muted">{p.shortDesc}</p>

          {p.sizes.length > 1 ? (
            <div className="flex gap-2">
              {p.sizes.map((s, i) => (
                <button key={s.label} onClick={() => setSizeIdx(i)} className={`rounded-md border px-4 py-2 font-body text-sm ${i === sizeIdx ? 'border-gold bg-gold/10 text-content' : 'border-line text-muted'}`}>
                  {s.label}
                </button>
              ))}
            </div>
          ) : null}

          <div className="text-2xl"><Price value={size?.price ?? p.basePrice} compareAt={size?.compareAtPrice} /></div>
          <p className="font-body text-sm text-muted">{(size?.stock ?? 0) > 0 ? 'In stock' : 'Out of stock'}</p>

          {p.type === 'bundle' && p.bundleItems?.length ? (
            <div>
              <h2 className="mb-2 font-display text-lg text-content">This bundle includes</h2>
              <ul className="list-disc pl-5 font-body text-content">
                {p.bundleItems.map((b, i) => (
                  <li key={i}>{typeof b.product === 'object' ? `${b.product.name} ×${b.qty}` : `Item ×${b.qty}`}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <NotesPyramid notes={p.notes} />
          <div className="prose max-w-none font-body text-content whitespace-pre-line">{p.description}</div>
        </div>
      </div>

      {related.data && related.data.length > 0 ? (
        <section>
          <h2 className="mb-4 font-display text-2xl text-content">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {related.data.map((r) => <ProductCard key={r.id} product={r} />)}
          </div>
        </section>
      ) : null}
    </article>
  );
}
```

- [ ] **Step 5: Implement the Bundles page**

```tsx
// apps/web/src/pages/Bundles.tsx
import { useQuery } from '@tanstack/react-query';
import { fetchProducts } from '../lib/api';
import { useSeo } from '../lib/useSeo';
import { ProductCard } from '../components/ProductCard';
import { Skeleton } from '../components/Skeleton';

export default function Bundles() {
  useSeo({ title: 'Bundles — HERENCIA', description: 'Curated HERENCIA perfume bundles.' });
  const bundles = useQuery({ queryKey: ['products', { type: 'bundle' }], queryFn: () => fetchProducts({ type: 'bundle' }) });

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl text-content">Bundles</h1>
      {bundles.isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-square" />)}
        </div>
      ) : bundles.data && bundles.data.items.length === 0 ? (
        <p className="font-body text-muted">No bundles available yet.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {bundles.data?.items.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run tests + build**

Run: `npm run test --workspace apps/web && npm run build --workspace apps/web`
Expected: PASS; build succeeds.

- [ ] **Step 7: Commit**

```bash
git add apps/web
git commit -m "feat(web): product detail (gallery/notes/sizes/related) + bundles list"
```

---

### Task 11: Admin catalog UI (token gate + product/bundle CRUD + scent families + upload)

**Files:**
- Create: `apps/web/src/features/admin/adminClient.ts`
- Create: `apps/web/src/features/admin/adminClient.test.ts`
- Create: `apps/web/src/features/admin/AdminTokenGate.tsx`
- Create: `apps/web/src/features/admin/ProductForm.tsx`
- Create: `apps/web/src/pages/admin/AdminApp.tsx` (replace placeholder)
- Create: `apps/web/src/pages/admin/AdminProducts.tsx`
- Create: `apps/web/src/pages/admin/AdminScentFamilies.tsx`

**Interfaces:**
- Consumes: `apiSend`, `fetchProducts`, `fetchScentFamilies`; `adminProductSchema`, `AdminProductInput`, `scentFamilySchema`; React Hook Form; `useQuery`/`useMutation`.
- Produces:
  - `adminClient.ts`: token storage (`getAdminToken`/`setAdminToken` via `sessionStorage`); `adminHeaders()`; `adminCreateProduct`, `adminUpdateProduct`, `adminDeleteProduct`, `adminCreateFamily`, `adminDeleteFamily`, `adminSignUpload`, `uploadImage(file)` (signs then POSTs to Cloudinary, returns public_id).
  - `<AdminTokenGate>` wraps admin routes; prompts for the token if missing.
  - `<ProductForm>` (RHF + zod resolver) for create/edit.
  - `AdminApp` default export: nested routes (`/admin`, `/admin/products`, `/admin/scent-families`) inside `AdminLayout`.

- [ ] **Step 1: Write the failing adminClient test**

```ts
// apps/web/src/features/admin/adminClient.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { getAdminToken, setAdminToken, adminHeaders } from './adminClient';

beforeEach(() => sessionStorage.clear());

describe('admin token storage', () => {
  it('persists and reads the token', () => {
    expect(getAdminToken()).toBe('');
    setAdminToken('secret-token-123456');
    expect(getAdminToken()).toBe('secret-token-123456');
    expect(adminHeaders()).toEqual({ 'x-admin-token': 'secret-token-123456' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/web`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement adminClient**

```ts
// apps/web/src/features/admin/adminClient.ts
import type { AdminProductInput, ProductDTO, ScentFamilyDTO } from '@herencia/shared';
import { apiSend, apiGet } from '../../lib/api';

const KEY = 'herencia.adminToken';
export const getAdminToken = (): string => sessionStorage.getItem(KEY) ?? '';
export const setAdminToken = (t: string): void => sessionStorage.setItem(KEY, t);
export const adminHeaders = (): Record<string, string> => ({ 'x-admin-token': getAdminToken() });

export const adminCreateProduct = (data: AdminProductInput) =>
  apiSend<ProductDTO>('POST', '/api/admin/products', data, adminHeaders());
export const adminUpdateProduct = (id: string, data: AdminProductInput) =>
  apiSend<ProductDTO>('PUT', `/api/admin/products/${id}`, data, adminHeaders());
export const adminDeleteProduct = (id: string) =>
  apiSend<void>('DELETE', `/api/admin/products/${id}`, undefined, adminHeaders());
export const adminCreateFamily = (data: { name: string; order?: number; description?: string }) =>
  apiSend<ScentFamilyDTO>('POST', '/api/admin/scent-families', data, adminHeaders());
export const adminDeleteFamily = (id: string) =>
  apiSend<void>('DELETE', `/api/admin/scent-families/${id}`, undefined, adminHeaders());

type SignResponse = { timestamp: number; signature: string; apiKey: string; cloudName: string; folder: string };
export const adminSignUpload = () => apiSend<SignResponse>('POST', '/api/admin/uploads/sign', {}, adminHeaders());

// Signs, then uploads directly to Cloudinary; returns the stored public_id.
export async function uploadImage(file: File): Promise<string> {
  const sig = await adminSignUpload();
  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sig.apiKey);
  form.append('timestamp', String(sig.timestamp));
  form.append('signature', sig.signature);
  form.append('folder', sig.folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, { method: 'POST', body: form });
  if (!res.ok) throw new Error('Cloudinary upload failed');
  const body = (await res.json()) as { public_id: string };
  return body.public_id;
}

export { apiGet };
```

- [ ] **Step 4: Implement AdminTokenGate + AdminLayout + AdminApp**

```tsx
// apps/web/src/features/admin/AdminTokenGate.tsx
import { useState, type ReactNode } from 'react';
import { getAdminToken, setAdminToken } from './adminClient';

export function AdminTokenGate({ children }: { children: ReactNode }) {
  const [hasToken, setHasToken] = useState(() => getAdminToken().length > 0);
  const [value, setValue] = useState('');
  if (hasToken) return <>{children}</>;
  return (
    <div className="mx-auto max-w-sm py-24">
      <h1 className="mb-4 font-display text-2xl text-content">Admin access</h1>
      <p className="mb-4 font-body text-sm text-muted">Enter the admin token to manage the catalog. (Interim — replaced by login in Milestone 2.)</p>
      <input type="password" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Admin token" className="mb-3 w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content" />
      <button onClick={() => { setAdminToken(value); setHasToken(value.length > 0); }} className="w-full rounded-md bg-maroon px-4 py-2 font-body text-cream">Continue</button>
    </div>
  );
}
```

```tsx
// apps/web/src/pages/admin/AdminApp.tsx
import { Routes, Route, Link } from 'react-router-dom';
import { AdminTokenGate } from '../../features/admin/AdminTokenGate';
import AdminProducts from './AdminProducts';
import AdminScentFamilies from './AdminScentFamilies';

export default function AdminApp() {
  return (
    <AdminTokenGate>
      <div className="min-h-screen">
        <header className="border-b border-line">
          <nav className="mx-auto flex max-w-6xl items-center gap-6 p-4 font-body text-sm">
            <Link to="/admin/products" className="font-display text-lg text-content">HERENCIA Admin</Link>
            <Link to="/admin/products" className="text-content hover:text-accent">Products</Link>
            <Link to="/admin/scent-families" className="text-content hover:text-accent">Scent families</Link>
            <Link to="/" className="ml-auto text-muted hover:text-accent">View store</Link>
          </nav>
        </header>
        <main className="mx-auto max-w-6xl p-4">
          <Routes>
            <Route path="/" element={<AdminProducts />} />
            <Route path="/products" element={<AdminProducts />} />
            <Route path="/scent-families" element={<AdminScentFamilies />} />
          </Routes>
        </main>
      </div>
    </AdminTokenGate>
  );
}
```

- [ ] **Step 5: Implement ProductForm (RHF + zod resolver)**

```tsx
// apps/web/src/features/admin/ProductForm.tsx
import { useForm, useFieldArray } from 'react-hook-form';
import { useState } from 'react';
import type { AdminProductInput, ProductDTO, ScentFamilyDTO } from '@herencia/shared';
import { GENDER, CONCENTRATION, PRODUCT_TYPE } from '@herencia/shared';
import { uploadImage } from './adminClient';

function toFormDefaults(p?: ProductDTO): AdminProductInput {
  if (!p) {
    return {
      name: '', type: 'perfume', shortDesc: '', description: '', images: [],
      sizes: [{ label: '50ml', price: 0, stock: 0 }], scentFamily: '',
      notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
      isFeatured: false, isActive: true, seo: {},
    };
  }
  return {
    name: p.name, type: p.type, shortDesc: p.shortDesc, description: p.description, images: p.images,
    sizes: p.sizes.map((s) => ({ label: s.label, price: s.price, compareAtPrice: s.compareAtPrice, stock: s.stock })),
    scentFamily: p.scentFamily?.id ?? '', notes: p.notes, gender: p.gender, concentration: p.concentration,
    isFeatured: p.isFeatured, isActive: p.isActive, seo: p.seo,
    bundleItems: p.bundleItems?.map((b) => ({ product: typeof b.product === 'object' ? b.product.id : b.product, qty: b.qty })),
  };
}

export function ProductForm({
  families, initial, onSubmit, submitting,
}: {
  families: ScentFamilyDTO[];
  initial?: ProductDTO;
  onSubmit: (data: AdminProductInput) => void;
  submitting: boolean;
}) {
  const { register, control, handleSubmit, setValue, watch } = useForm<AdminProductInput>({ defaultValues: toFormDefaults(initial) });
  const sizes = useFieldArray({ control, name: 'sizes' });
  const images = watch('images');
  const [uploading, setUploading] = useState(false);

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const publicId = await uploadImage(file);
      setValue('images', [...(images ?? []), publicId]);
    } finally {
      setUploading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <input {...register('name')} placeholder="Name" className="w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content" />
      <div className="grid grid-cols-2 gap-3">
        <select {...register('type')} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content">
          {PRODUCT_TYPE.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select {...register('scentFamily')} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content">
          <option value="">Select scent family</option>
          {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select {...register('gender')} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content">
          {GENDER.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select {...register('concentration')} className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content">
          {CONCENTRATION.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <input {...register('shortDesc')} placeholder="Short description" className="w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content" />
      <textarea {...register('description')} placeholder="Full description" rows={4} className="w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content" />

      <div>
        <p className="mb-2 font-display text-content">Sizes</p>
        {sizes.fields.map((field, i) => (
          <div key={field.id} className="mb-2 grid grid-cols-4 gap-2">
            <input {...register(`sizes.${i}.label`)} placeholder="50ml" className="rounded-md border border-line bg-bg px-2 py-1 font-body text-content" />
            <input type="number" step="0.01" {...register(`sizes.${i}.price`, { valueAsNumber: true })} placeholder="Price" className="rounded-md border border-line bg-bg px-2 py-1 font-body text-content" />
            <input type="number" {...register(`sizes.${i}.stock`, { valueAsNumber: true })} placeholder="Stock" className="rounded-md border border-line bg-bg px-2 py-1 font-body text-content" />
            <button type="button" onClick={() => sizes.remove(i)} className="rounded-md border border-line px-2 py-1 font-body text-sm text-muted">Remove</button>
          </div>
        ))}
        <button type="button" onClick={() => sizes.append({ label: '', price: 0, stock: 0 })} className="rounded-md border border-gold px-3 py-1 font-body text-sm text-content">Add size</button>
      </div>

      <div>
        <p className="mb-2 font-display text-content">Images</p>
        <div className="mb-2 flex flex-wrap gap-2 font-body text-xs text-muted">{(images ?? []).map((id) => <span key={id} className="rounded bg-line/30 px-2 py-1">{id}</span>)}</div>
        <input type="file" accept="image/*" onChange={(e) => onPickImage(e.target.files?.[0])} />
        {uploading ? <span className="ml-2 font-body text-sm text-muted">Uploading…</span> : null}
      </div>

      <label className="flex items-center gap-2 font-body text-content"><input type="checkbox" {...register('isFeatured')} /> Featured</label>
      <label className="flex items-center gap-2 font-body text-content"><input type="checkbox" {...register('isActive')} /> Active</label>

      <button type="submit" disabled={submitting} className="rounded-md bg-maroon px-6 py-2 font-body text-cream disabled:opacity-50">
        {submitting ? 'Saving…' : 'Save product'}
      </button>
    </form>
  );
}
```

> **Note:** Bundle `bundleItems` editing is intentionally minimal in M1 — the form covers perfumes fully; bundles can be seeded/edited via the seed script. A bundle-items picker is a candidate for a later milestone. Keep YAGNI.

- [ ] **Step 6: Implement AdminProducts + AdminScentFamilies pages**

```tsx
// apps/web/src/pages/admin/AdminProducts.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { AdminProductInput, ProductDTO } from '@herencia/shared';
import { fetchProducts, fetchScentFamilies } from '../../lib/api';
import { adminCreateProduct, adminUpdateProduct, adminDeleteProduct } from '../../features/admin/adminClient';
import { ProductForm } from '../../features/admin/ProductForm';

export default function AdminProducts() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<ProductDTO | null>(null);
  const [creating, setCreating] = useState(false);
  const families = useQuery({ queryKey: ['scent-families'], queryFn: fetchScentFamilies });
  const products = useQuery({ queryKey: ['admin-products'], queryFn: () => fetchProducts({ limit: 48 }) });

  const invalidate = () => { qc.invalidateQueries({ queryKey: ['admin-products'] }); setEditing(null); setCreating(false); };
  const createMut = useMutation({ mutationFn: (d: AdminProductInput) => adminCreateProduct(d), onSuccess: invalidate });
  const updateMut = useMutation({ mutationFn: (d: AdminProductInput) => adminUpdateProduct(editing!.id, d), onSuccess: invalidate });
  const deleteMut = useMutation({ mutationFn: (id: string) => adminDeleteProduct(id), onSuccess: () => qc.invalidateQueries({ queryKey: ['admin-products'] }) });

  if (creating || editing) {
    return (
      <div>
        <button onClick={() => { setCreating(false); setEditing(null); }} className="mb-4 font-body text-sm text-accent">← Back to list</button>
        <h1 className="mb-4 font-display text-2xl text-content">{editing ? 'Edit product' : 'New product'}</h1>
        <ProductForm
          families={families.data ?? []}
          initial={editing ?? undefined}
          submitting={createMut.isPending || updateMut.isPending}
          onSubmit={(d) => (editing ? updateMut.mutate(d) : createMut.mutate(d))}
        />
        {(createMut.isError || updateMut.isError) ? <p className="mt-3 font-body text-sm text-red-500">Save failed — check fields and token.</p> : null}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-display text-2xl text-content">Products</h1>
        <button onClick={() => setCreating(true)} className="rounded-md bg-maroon px-4 py-2 font-body text-cream">New product</button>
      </div>
      <ul className="divide-y divide-line">
        {products.data?.items.map((p) => (
          <li key={p.id} className="flex items-center justify-between py-3 font-body">
            <span className="text-content">{p.name} <span className="text-muted">· {p.type}</span></span>
            <span className="flex gap-3">
              <button onClick={() => setEditing(p)} className="text-accent">Edit</button>
              <button onClick={() => { if (confirm(`Delete ${p.name}?`)) deleteMut.mutate(p.id); }} className="text-red-500">Delete</button>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

```tsx
// apps/web/src/pages/admin/AdminScentFamilies.tsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchScentFamilies } from '../../lib/api';
import { adminCreateFamily, adminDeleteFamily } from '../../features/admin/adminClient';

export default function AdminScentFamilies() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const families = useQuery({ queryKey: ['scent-families'], queryFn: fetchScentFamilies });
  const invalidate = () => qc.invalidateQueries({ queryKey: ['scent-families'] });
  const createMut = useMutation({ mutationFn: () => adminCreateFamily({ name }), onSuccess: () => { setName(''); invalidate(); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => adminDeleteFamily(id), onSuccess: invalidate });

  return (
    <div>
      <h1 className="mb-4 font-display text-2xl text-content">Scent families</h1>
      <div className="mb-4 flex gap-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="New family name" className="rounded-md border border-line bg-bg px-3 py-2 font-body text-content" />
        <button onClick={() => createMut.mutate()} disabled={!name || createMut.isPending} className="rounded-md bg-maroon px-4 py-2 font-body text-cream disabled:opacity-50">Add</button>
      </div>
      <ul className="divide-y divide-line">
        {families.data?.map((f) => (
          <li key={f.id} className="flex items-center justify-between py-2 font-body text-content">
            {f.name}
            <button onClick={() => deleteMut.mutate(f.id)} className="text-red-500">Delete</button>
          </li>
        ))}
      </ul>
      {deleteMut.isError ? <p className="mt-2 font-body text-sm text-red-500">Delete failed (family may be in use).</p> : null}
    </div>
  );
}
```

- [ ] **Step 7: Run tests + typecheck + build**

Run: `npm run test --workspace apps/web && npm run build --workspace apps/web`
Expected: PASS; build succeeds; admin emitted as its own lazy chunk.

- [ ] **Step 8: Commit**

```bash
git add apps/web
git commit -m "feat(web): admin catalog UI — token gate, product CRUD, scent families, upload"
```

---

### Task 12: Milestone wiring, full-suite verification, and docs update

**Files:**
- Modify: `docs/TASKS.md` (mark Milestone 1 items done)
- Modify: `docs/memory/current-state.md`, `docs/memory/next-session.md`
- Modify: `docs/memory/decisions.md` (log interim-admin-token + request-time SSR-lite decisions)
- Create: `.superpowers/sdd/progress-m1.md` (M1 execution ledger)

**Interfaces:**
- Consumes: nothing new.
- Produces: a green full workspace and updated state docs.

- [ ] **Step 1: Run the full workspace suite**

Run: `npm run lint && npm run typecheck && npm run test && npm run build`
Expected: lint 0 errors; typecheck passes; all API + web tests pass; build emits `apps/web/dist` and `apps/api/dist`.

- [ ] **Step 2: Manual smoke (optional but recommended)**

Run: `npm run seed --workspace apps/api` then `npm run dev`. Visit `http://localhost:5173/products` (filters work), a product detail page, `/bundles`, and `/admin` (enter the `ADMIN_TOKEN` from `.env`). Confirm CRUD round-trips.

- [ ] **Step 3: Update `docs/TASKS.md`**

Mark all Milestone 1 checkboxes `[x]`; also mark the two deferred Milestone 0 items now delivered: "Seed script" and "App shells: storefront + admin layouts + router".

- [ ] **Step 4: Update memory files**

In `current-state.md`: Phase → "Milestone 1 COMPLETE; next = Milestone 2 (commerce)". List M1 deliverables. In `next-session.md`: set the TL;DR to Milestone 2 (cart/checkout/auth/orders) and note that the interim admin token guard must be replaced by real JWT-cookie auth + role guard in M2 (same `requireAdmin` seam). In `decisions.md`: append rows for "Admin auth (M1 interim)" = header `x-admin-token` and "SSR-lite implementation" = request-time `<head>` injection.

- [ ] **Step 5: Write the M1 SDD ledger**

Create `.superpowers/sdd/progress-m1.md` summarizing each task, its commit range, and review outcome (mirror the M0 ledger format).

- [ ] **Step 6: Commit**

```bash
git add docs .superpowers
git commit -m "docs: mark Milestone 1 complete; update state, decisions, SDD ledger"
```

---

## Self-Review

**Spec coverage (vs. `next-session.md` M1 scope + `docs/04/05/06/11/12`):**
- Product + ScentFamily models → Task 2. ✅
- Seed script (admin user, families, perfumes, bundles, settings) → Task 4. ✅
- Admin products/bundles CRUD + Cloudinary upload → Tasks 5 (API) + 11 (UI). ✅
- Storefront Home → Task 8; Products list (search/filter/sort/pagination) → Task 9; Product detail (gallery/notes/sizes/related) → Task 10; Bundles list/detail → Task 10 (detail reuses ProductDetail). ✅
- SEO: server-injected meta + JSON-LD (Product + AggregateRating) + sitemap.xml + robots.txt + SPA serving → Task 6. ✅
- Excluded later-milestone features (reviews, quiz, banners, blog, cart/checkout, full auth) → not built. ✅

**Decisions surfaced (not in docs, chosen here):** interim `x-admin-token` admin guard (Task 5/11) and request-time `<head>` injection for SSR-lite (Task 6). Both flagged in Global Constraints and logged in Task 12. Build-time static prerender deferred to M4.

**Placeholder scan:** Task 7 intentionally creates one-line placeholder pages so the router compiles before Tasks 8–11 fill them — these are replaced within this plan, not left as TODOs. No "TBD"/"add error handling"/"similar to Task N" placeholders elsewhere; every code step shows complete code.

**Type consistency:** DTO names (`ProductDTO`, `ProductListDTO`, `ScentFamilyDTO`, `ProductSizeDTO`) defined in Task 1 and used identically in API serializers (Task 3), SEO (Task 6), and web (Tasks 7–11). `createApp` signature evolves across Tasks 3/5/6 — each task shows the full updated signature. `adminProductSchema`/`scentFamilySchema`/`productQuerySchema`/`slugify` defined in Task 1, consumed consistently. `apiGet`/`apiSend`/`adminHeaders` signatures match across web tasks.

**Note on Cloudinary env on the web:** `VITE_CLOUDINARY_CLOUD_NAME` must be set for the web app for real image URLs; without it, `cld()` returns the raw value (fine for tests and seeded placeholder IDs). The implementer should add it to `apps/web/.env` if exercising real uploads.
