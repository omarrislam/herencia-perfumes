# Milestone 2 — Commerce Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the full commerce layer to HERENCIA — real JWT/cookie auth + roles, a guest+account cart with server-side pricing, COD checkout with a WhatsApp capture link, customer & admin order management, and an account area with wishlist.

**Architecture:** Express modules stay thin (route → service → model). A new JWT-cookie auth replaces the *internals* of the interim `requireAdmin` guard while the admin route definitions stay untouched. Prices are **never trusted from the client**: a single `priceItems()` service recomputes every line from the DB and is shared by the cart-pricing endpoint and order creation. The web app gains an `AuthContext` and a `CartContext` (localStorage for guests, server-persisted + merge-on-login for accounts) layered onto the existing React Query + typed-client setup.

**Tech Stack:** Node/Express/TypeScript, Mongoose 8, Zod (shared schemas), `jsonwebtoken` + `bcryptjs`, Vitest + Supertest (api), React 18 + React Router + React Query + Vitest/RTL (web).

## Global Constraints

- **TypeScript strict** everywhere; no `any` except the existing serialize escape hatch pattern.
- **Validate every input with shared Zod schemas** from `@herencia/shared`; **never trust client prices** — recompute from the DB.
- **Money:** `number` in EGP, 2-decimal guard (reuse the `money` Zod refinement pattern in `packages/shared/src/schemas/catalog.ts`).
- **Error shape:** `{ error: { message, code, details? } }` via the existing `HttpError` + `errorHandler` (`apps/api/src/middleware/error.ts`).
- **Pagination envelope:** `{ items, total, page, pages }`.
- **Auth:** JWT (HS256, 7-day) in an **httpOnly + SameSite=Lax + Secure-in-prod** cookie named `herencia_token`; passwords hashed with **bcryptjs cost ≥ 12**; roles `customer` | `admin`.
- **DTO contract is single-sourced** in `packages/shared` and consumed by api + web. API output ids are strings.
- **Mobile-first, dark mode, brand tokens** (`text-content`, `text-muted`, `bg-bg`, `border-line`, `bg-maroon`, `text-cream`, `text-accent`, `font-display`, `font-body`) — match existing components.
- **Commits:** frequent; every commit body ends with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Branch:** `feat/milestone-2-commerce` (NOT master). **Scope:** commerce only — no reviews/quiz/banners/blog (M3), no animation/a11y/perf passes (M4).
- **Tests:** api suite runs serialized (`fileParallelism: false`) with `mongodb-memory-server`; mirror the existing `connectMemory`/`clearDb` harness (`apps/api/src/test/db.ts`). Run lint via the **root** `npm run lint`.

---

## File Structure

**`packages/shared/src/`**
- `enums.ts` — *modify*: add `ORDER_STATUS`.
- `schemas/auth.ts` — *create*: register/login schemas + `UserDTO`.
- `schemas/account.ts` — *create*: profile/address/wishlist schemas + `AddressDTO`.
- `schemas/cart.ts` — *create*: cart-item / price-cart / set-cart schemas + priced-cart DTOs.
- `schemas/order.ts` — *modify*: add status schema, transitions, order DTOs, `CreateOrderResultDTO`.
- `index.ts` — *modify*: re-export the new modules.

**`apps/api/src/`**
- `lib/jwt.ts` — *create*: `signToken` / `verifyToken`.
- `lib/authCookie.ts` — *create*: `setAuthCookie` / `clearAuthCookie` / `AUTH_COOKIE`.
- `lib/whatsapp.ts` — *create*: `buildWhatsAppUrl`.
- `lib/orderNumber.ts` — *create*: `generateOrderNumber`.
- `lib/serialize.ts` — *modify*: add `toUserDTO`, `toAddressDTO`, `toOrderDTO`.
- `middleware/auth.ts` — *create*: `authenticate`, `requireAuth`, `requireRole`, Request augmentation.
- `middleware/requireAdmin.ts` — *modify*: re-implement internals as cookie/JWT + admin role (seam name kept).
- `config/env.ts` — *modify*: drop `ADMIN_TOKEN`.
- `models/User.ts` — *modify*: add `addresses`, `wishlist`.
- `models/Cart.ts` — *create*.
- `models/Order.ts` — *create*.
- `modules/cart/service.ts` — *create*: `priceItems`.
- `routes/auth.ts` — *create*.
- `routes/cart.ts` — *create*.
- `routes/orders.ts` — *create*.
- `routes/account.ts` — *create*.
- `routes/admin.ts` — *modify*: add order routes; drop `adminToken` opt; mount new `requireAdmin`.
- `routes/catalog.ts` — *modify*: `[F-min-5]` type-filter related.
- `app.ts` — *modify*: drop `adminToken`; mount auth/cart/orders/account routers.
- `server.ts` — *modify*: drop `adminToken`.
- `seed.ts` — *modify*: ensure admin user has a known password; seed Settings shipping fields.
- `test/db.ts` — *unchanged*; `test/auth.ts` — *create*: cookie helper.
- `vitest.config.ts` — *modify*: inject a test `JWT_SECRET`.

**`apps/web/src/`**
- `lib/api.ts` — *modify*: add auth/cart/order/account client fns + DTO imports.
- `features/auth/AuthContext.tsx` — *create*: `AuthProvider` + `useAuth`.
- `features/auth/RequireAuth.tsx`, `features/auth/RequireAdmin.tsx` — *create*: route guards.
- `pages/Login.tsx`, `pages/Register.tsx` — *create*.
- `features/cart/CartContext.tsx` — *create*: `CartProvider` + `useCart`.
- `features/cart/CartDrawer.tsx` — *create*.
- `pages/Cart.tsx`, `pages/Checkout.tsx`, `pages/OrderConfirmation.tsx` — *create*.
- `pages/Account.tsx` — *create*: profile + addresses + orders + wishlist.
- `pages/admin/AdminOrders.tsx` — *create*.
- `features/admin/adminClient.ts` — *modify*: drop `x-admin-token`; cookie auth.
- `features/admin/AdminTokenGate.tsx` — *delete* (replaced by `RequireAdmin`).
- `components/ProductCard.tsx` — *modify*: `[F-min-4]` compareAt/basePrice pairing + wishlist heart.
- `components/WishlistButton.tsx` — *create*.
- `app/StorefrontLayout.tsx` — *modify*: cart icon + account/login nav.
- `app/router.tsx` — *modify*: register new routes + providers.
- `main.tsx` — *modify*: wrap with `AuthProvider` + `CartProvider`.

---

## Task 1: Shared — auth & account schemas/DTOs

**Files:**
- Create: `packages/shared/src/schemas/auth.ts`
- Create: `packages/shared/src/schemas/account.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/schemas/auth.test.ts`, `packages/shared/src/schemas/account.test.ts`

**Interfaces:**
- Produces: `registerSchema`/`RegisterInput` (`{ name, email, password }`), `loginSchema`/`LoginInput` (`{ email, password }`), `UserDTO` (`{ id, name, email, role: 'customer'|'admin', phone? }`), `addressSchema`/`AddressInput` (`{ label, line1, line2?, city, governorate, phone, isDefault? }`), `AddressDTO` (`AddressInput & { id: string }`), `updateProfileSchema`/`UpdateProfileInput` (`{ name?, phone? }`), `wishlistItemSchema`/`WishlistItemInput` (`{ productId }`).

- [ ] **Step 1: Write the failing tests**

`packages/shared/src/schemas/auth.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { registerSchema, loginSchema } from './auth';

describe('registerSchema', () => {
  it('accepts a valid registration', () => {
    expect(registerSchema.safeParse({ name: 'Mai', email: 'mai@x.com', password: 'secret12' }).success).toBe(true);
  });
  it('rejects a short password', () => {
    expect(registerSchema.safeParse({ name: 'Mai', email: 'mai@x.com', password: 'short' }).success).toBe(false);
  });
  it('rejects a bad email', () => {
    expect(loginSchema.safeParse({ email: 'nope', password: 'secret12' }).success).toBe(false);
  });
});
```

`packages/shared/src/schemas/account.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { addressSchema, updateProfileSchema, wishlistItemSchema } from './account';

describe('account schemas', () => {
  it('accepts a valid address', () => {
    expect(addressSchema.safeParse({ label: 'Home', line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '0100000000' }).success).toBe(true);
  });
  it('rejects an address missing governorate', () => {
    expect(addressSchema.safeParse({ label: 'Home', line1: '1 St', city: 'Cairo', phone: '0100000000' }).success).toBe(false);
  });
  it('accepts an empty profile update', () => {
    expect(updateProfileSchema.safeParse({}).success).toBe(true);
  });
  it('rejects a wishlist item with a bad id', () => {
    expect(wishlistItemSchema.safeParse({ productId: 'xyz' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test --workspace packages/shared`
Expected: FAIL — `Cannot find module './auth'` / `'./account'`.

- [ ] **Step 3: Implement the schemas**

`packages/shared/src/schemas/auth.ts`:
```ts
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(100),
});
export type LoginInput = z.infer<typeof loginSchema>;

export type UserDTO = {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
  phone?: string;
};
```

`packages/shared/src/schemas/account.ts`:
```ts
import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'invalid id');

export const addressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(80),
  governorate: z.string().trim().min(1).max(80),
  phone: z.string().trim().min(6).max(20),
  isDefault: z.boolean().optional(),
});
export type AddressInput = z.infer<typeof addressSchema>;
export type AddressDTO = AddressInput & { id: string };

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().min(6).max(20).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const wishlistItemSchema = z.object({ productId: objectId });
export type WishlistItemInput = z.infer<typeof wishlistItemSchema>;
```

Append to `packages/shared/src/index.ts`:
```ts
export * from './schemas/auth';
export * from './schemas/account';
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test --workspace packages/shared`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/auth.ts packages/shared/src/schemas/account.ts packages/shared/src/schemas/auth.test.ts packages/shared/src/schemas/account.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): auth and account schemas + DTOs"
```

---

## Task 2: Shared — cart & order schemas/DTOs

**Files:**
- Modify: `packages/shared/src/enums.ts`
- Create: `packages/shared/src/schemas/cart.ts`
- Modify: `packages/shared/src/schemas/order.ts`
- Modify: `packages/shared/src/index.ts`
- Test: `packages/shared/src/schemas/cart.test.ts`, `packages/shared/src/schemas/order.test.ts` (extend existing)

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `ORDER_STATUS` = `['pending','confirmed','shipped','delivered','cancelled'] as const`; `OrderStatus`.
  - `ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]>`.
  - `cartItemSchema`/`CartItemInput` (`{ productId, sizeLabel, qty }`), `priceCartSchema`/`PriceCartInput` (`{ items: CartItemInput[] }`), `setCartSchema` (alias for items array, qty ≥ 0 allows removal? — qty ≥ 1 only; removal = omit).
  - `PricedCartLineDTO` = `{ productId, slug, name, image, sizeLabel, unitPrice, qty, lineTotal, available, maxQty }`.
  - `PricedCartDTO` = `{ items: PricedCartLineDTO[], subtotal, shipping, total, hasUnavailable }`.
  - `updateOrderStatusSchema`/`UpdateOrderStatusInput` (`{ status }`).
  - `OrderItemDTO` = `{ product: string, name, sizeLabel, unitPrice, qty, image }`.
  - `OrderDTO` = `{ id, orderNumber, items: OrderItemDTO[], customer, shippingAddress, subtotal, shipping, total, status, paymentMethod: 'cod', notes?, createdAt }`.
  - `CreateOrderResultDTO` = `{ order: OrderDTO, whatsappUrl: string }`.
  - (`createOrderSchema`/`CreateOrderInput` already exist — keep.)

- [ ] **Step 1: Write the failing tests**

`packages/shared/src/schemas/cart.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { cartItemSchema, priceCartSchema } from './cart';

describe('cart schemas', () => {
  it('accepts a valid line', () => {
    expect(cartItemSchema.safeParse({ productId: 'a'.repeat(24), sizeLabel: '50ml', qty: 2 }).success).toBe(true);
  });
  it('rejects qty < 1', () => {
    expect(cartItemSchema.safeParse({ productId: 'a'.repeat(24), sizeLabel: '50ml', qty: 0 }).success).toBe(false);
  });
  it('accepts an empty cart for pricing', () => {
    expect(priceCartSchema.safeParse({ items: [] }).success).toBe(true);
  });
});
```

Append to `packages/shared/src/schemas/order.test.ts`:
```ts
import { ORDER_STATUS, ORDER_STATUS_TRANSITIONS, updateOrderStatusSchema } from './order';

describe('order status', () => {
  it('lists pending as the initial status', () => {
    expect(ORDER_STATUS[0]).toBe('pending');
  });
  it('allows pending → confirmed but not delivered → pending', () => {
    expect(ORDER_STATUS_TRANSITIONS.pending).toContain('confirmed');
    expect(ORDER_STATUS_TRANSITIONS.delivered).toEqual([]);
  });
  it('validates a status payload', () => {
    expect(updateOrderStatusSchema.safeParse({ status: 'shipped' }).success).toBe(true);
    expect(updateOrderStatusSchema.safeParse({ status: 'banana' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test --workspace packages/shared`
Expected: FAIL — missing `./cart`, missing `ORDER_STATUS` exports.

- [ ] **Step 3: Implement**

Append to `packages/shared/src/enums.ts`:
```ts
export const ORDER_STATUS = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];
```

`packages/shared/src/schemas/cart.ts`:
```ts
import { z } from 'zod';

const objectId = z.string().regex(/^[a-fA-F0-9]{24}$/, 'invalid id');

export const cartItemSchema = z.object({
  productId: objectId,
  sizeLabel: z.string().min(1).max(20),
  qty: z.number().int().min(1).max(99),
});
export type CartItemInput = z.infer<typeof cartItemSchema>;

export const priceCartSchema = z.object({ items: z.array(cartItemSchema).max(100) });
export type PriceCartInput = z.infer<typeof priceCartSchema>;

// Server-set cart (logged-in PUT / merge) — same shape.
export const setCartSchema = priceCartSchema;
export type SetCartInput = PriceCartInput;

export type PricedCartLineDTO = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  sizeLabel: string;
  unitPrice: number;
  qty: number;
  lineTotal: number;
  available: boolean;
  maxQty: number;
};
export type PricedCartDTO = {
  items: PricedCartLineDTO[];
  subtotal: number;
  shipping: number;
  total: number;
  hasUnavailable: boolean;
};
```

Append to `packages/shared/src/schemas/order.ts` (keep the existing `createOrderSchema`):
```ts
import { ORDER_STATUS, type OrderStatus } from '../enums';

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  cancelled: [],
};

export const updateOrderStatusSchema = z.object({ status: z.enum(ORDER_STATUS) });
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;

export type OrderItemDTO = {
  product: string;
  name: string;
  sizeLabel: string;
  unitPrice: number;
  qty: number;
  image: string;
};
export type OrderDTO = {
  id: string;
  orderNumber: string;
  items: OrderItemDTO[];
  customer: { name: string; phone: string; email?: string };
  shippingAddress: { line1: string; line2?: string; city: string; governorate: string; phone: string };
  subtotal: number;
  shipping: number;
  total: number;
  status: OrderStatus;
  paymentMethod: 'cod';
  notes?: string;
  createdAt: string;
};
export type CreateOrderResultDTO = { order: OrderDTO; whatsappUrl: string };
```

Append to `packages/shared/src/index.ts`:
```ts
export * from './schemas/cart';
```

- [ ] **Step 4: Run to verify they pass**

Run: `npm run test --workspace packages/shared`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/enums.ts packages/shared/src/schemas/cart.ts packages/shared/src/schemas/order.ts packages/shared/src/schemas/cart.test.ts packages/shared/src/schemas/order.test.ts packages/shared/src/index.ts
git commit -m "feat(shared): cart + order status schemas and DTOs"
```

---

## Task 3: Catalog carry-over fixes (`[F-min-5]`, `[F-min-4]`)

**Files:**
- Modify: `apps/api/src/routes/catalog.ts` (related endpoint type-filter)
- Test: `apps/api/src/routes/catalog.test.ts` (extend)
- Modify: `apps/web/src/components/ProductCard.tsx` (compareAt/basePrice pairing)
- Test: `apps/web/src/components/ProductCard.test.tsx` (extend)

**Interfaces:**
- Consumes: existing `ProductDTO`, related route.
- Produces: no new exports — behavior fixes only.

- [ ] **Step 1: Read the current related handler**

Read `apps/api/src/routes/catalog.ts` and find the `/products/:slug/related` handler. It currently matches same `scentFamily` excluding self. The fix: also filter `type: product.type` so a bundle never surfaces in a perfume's "related" and vice-versa.

- [ ] **Step 2: Write the failing API test**

Append to `apps/api/src/routes/catalog.test.ts` (inside the existing related `describe`, add a bundle in `beforeEach` first — add this product create after the three existing ones):
```ts
// in beforeEach, after the three perfumes:
await Product.create({
  name: 'Woody Bundle', type: 'bundle', shortDesc: 's', description: 'd', images: ['x'],
  sizes: [{ label: 'set', price: 1500, stock: 3 }], scentFamily: woody._id,
  notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'Other',
  bundleItems: [{ product: (await Product.findOne({ slug: 'royal-oud' }))!._id, qty: 1 }],
});
```
```ts
it('excludes products of a different type from related', async () => {
  const res = await request(app).get('/api/products/royal-oud/related');
  expect(res.status).toBe(200);
  expect(res.body.every((p: { type: string }) => p.type === 'perfume')).toBe(true);
});
```
> Note: `woody` is declared with `const` in the existing `beforeEach`; the new create references it and `Product.findOne`, so place it after the existing creates.

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test --workspace apps/api -- catalog`
Expected: FAIL — bundle appears in related (type not filtered).

- [ ] **Step 4: Implement the API fix**

In `apps/api/src/routes/catalog.ts`, in the related handler, add `type: product.type` to the query that finds related products (alongside `scentFamily` and `_id: { $ne: product._id }`, `isActive: true`).

- [ ] **Step 5: Run to verify the API test passes**

Run: `npm run test --workspace apps/api -- catalog`
Expected: PASS.

- [ ] **Step 6: Write the failing web test**

Read `apps/web/src/components/ProductCard.tsx` first. `[F-min-4]`: the card must pair `basePrice` with the `compareAtPrice` of the **size that yields basePrice** (the min-price size), not `sizes[0]`. Append to `apps/web/src/components/ProductCard.test.tsx`:
```ts
it('shows the compareAt price of the cheapest size, not sizes[0]', () => {
  const product = {
    // minimal ProductDTO; cheapest size is the SECOND entry
    id: '1', name: 'X', slug: 'x', type: 'perfume', shortDesc: 's', description: 'd',
    images: ['img'], basePrice: 800, scentFamily: null,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
    rating: { avg: 0, count: 0 }, isFeatured: false, isActive: true, seo: {},
    sizes: [
      { label: '100ml', price: 1200, compareAtPrice: 1500, stock: 5 },
      { label: '50ml', price: 800, compareAtPrice: 1000, stock: 5 },
    ],
  } as const;
  render(<MemoryRouter><ProductCard product={product as never} /></MemoryRouter>);
  // compareAt for the basePrice (800) size is 1000, not 1500
  expect(screen.getByText(/1,?000/)).toBeInTheDocument();
  expect(screen.queryByText(/1,?500/)).not.toBeInTheDocument();
});
```
> Match the existing test file's imports (`render`, `screen`, `MemoryRouter`). If the existing tests use a `makeProduct` helper, reuse it and override `sizes`/`basePrice` instead of inlining.

- [ ] **Step 7: Run to verify it fails**

Run: `npm run test --workspace apps/web -- ProductCard`
Expected: FAIL — card reads `sizes[0].compareAtPrice` (1500).

- [ ] **Step 8: Implement the web fix**

In `ProductCard.tsx`, derive the base size:
```ts
const baseSize = product.sizes.reduce((min, s) => (s.price < min.price ? s : min), product.sizes[0]);
```
Use `baseSize.compareAtPrice` (with `baseSize.compareAtPrice > product.basePrice` guard) where the strike-through price renders.

- [ ] **Step 9: Run to verify it passes**

Run: `npm run test --workspace apps/web -- ProductCard`
Expected: PASS.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/routes/catalog.ts apps/api/src/routes/catalog.test.ts apps/web/src/components/ProductCard.tsx apps/web/src/components/ProductCard.test.tsx
git commit -m "fix(catalog): type-filter related [F-min-5]; pair basePrice with its size compareAt [F-min-4]"
```

---

## Task 4: API auth foundation — JWT, cookie, middleware, requireAdmin rewire

**Files:**
- Add dep: `jsonwebtoken` + `@types/jsonwebtoken` (api workspace)
- Create: `apps/api/src/lib/jwt.ts`, `apps/api/src/lib/authCookie.ts`, `apps/api/src/middleware/auth.ts`, `apps/api/src/test/auth.ts`
- Modify: `apps/api/src/middleware/requireAdmin.ts`, `apps/api/src/config/env.ts`, `apps/api/src/app.ts`, `apps/api/src/server.ts`, `apps/api/src/routes/admin.ts`, `apps/api/vitest.config.ts`
- Modify (rewire to cookie auth): `apps/api/src/routes/admin.test.ts`, `apps/api/src/routes/catalog.test.ts`, `apps/api/src/routes/settings.test.ts`, `apps/api/src/middleware/spa.test.ts`, `apps/api/src/app.test.ts` (any `createApp({ adminToken })` call sites)
- Test: `apps/api/src/lib/jwt.test.ts`, `apps/api/src/middleware/auth.test.ts`

**Interfaces:**
- Consumes: `UserDTO['role']` from `@herencia/shared`.
- Produces:
  - `signToken(payload: { sub: string; role: 'customer' | 'admin' }): string`
  - `verifyToken(token: string): { sub: string; role: 'customer' | 'admin' } | null`
  - `AUTH_COOKIE = 'herencia_token'`; `setAuthCookie(res, token)`, `clearAuthCookie(res)`
  - middleware `authenticate` (optional — attaches `req.user`), `requireAuth`, `requireRole(role)`
  - `req.user?: { id: string; role: 'customer' | 'admin' }` (Express augmentation)
  - `requireAdmin` (no-arg `RequestHandler` = authenticate + admin role)
  - test helper `authCookie(userId: string, role): string` returning a `herencia_token=...` cookie string

- [ ] **Step 1: Add dependencies & test secret**

```bash
npm install jsonwebtoken --workspace apps/api
npm install -D @types/jsonwebtoken --workspace apps/api
```
Modify `apps/api/vitest.config.ts` to always inject a test secret — merge into the existing `test.env`:
```ts
export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
    env: {
      JWT_SECRET: 'test-jwt-secret-at-least-16-chars',
      ...(memTmp ? { MONGOMS_TMPDIR: memTmp, TEMP: memTmp, TMP: memTmp } : {}),
    },
  },
});
```

- [ ] **Step 2: Write the failing jwt + middleware tests**

`apps/api/src/lib/jwt.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { signToken, verifyToken } from './jwt';

describe('jwt', () => {
  it('round-trips a payload', () => {
    const t = signToken({ sub: 'abc', role: 'admin' });
    expect(verifyToken(t)).toMatchObject({ sub: 'abc', role: 'admin' });
  });
  it('returns null for garbage', () => {
    expect(verifyToken('not.a.token')).toBeNull();
  });
});
```

`apps/api/src/middleware/auth.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { authenticate, requireAuth, requireRole } from './auth';
import { errorHandler } from './error';
import { authCookie } from '../test/auth';

function appWith(handler: express.RequestHandler) {
  const app = express();
  app.use(cookieParser());
  app.get('/p', authenticate, handler, (req, res) => res.json({ id: req.user?.id, role: req.user?.role }));
  app.use(errorHandler);
  return app;
}

describe('auth middleware', () => {
  it('401s requireAuth without a cookie', async () => {
    const res = await request(appWith(requireAuth)).get('/p');
    expect(res.status).toBe(401);
  });
  it('passes requireAuth with a valid cookie', async () => {
    const res = await request(appWith(requireAuth)).get('/p').set('Cookie', authCookie('u1', 'customer'));
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'u1', role: 'customer' });
  });
  it('403s requireRole admin for a customer', async () => {
    const res = await request(appWith(requireRole('admin'))).get('/p').set('Cookie', authCookie('u1', 'customer'));
    expect(res.status).toBe(403);
  });
});
```

- [ ] **Step 3: Run to verify they fail**

Run: `npm run test --workspace apps/api -- jwt auth`
Expected: FAIL — modules missing.

- [ ] **Step 4: Implement jwt, cookie, middleware, test helper**

`apps/api/src/lib/jwt.ts`:
```ts
import jwt from 'jsonwebtoken';

export type TokenPayload = { sub: string; role: 'customer' | 'admin' };

function secret(): string {
  const s = process.env['JWT_SECRET'];
  if (!s || s.length < 16) throw new Error('JWT_SECRET missing or too short');
  return s;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, secret(), { algorithm: 'HS256', expiresIn: '7d' });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret());
    if (typeof decoded === 'object' && decoded && 'sub' in decoded && 'role' in decoded) {
      return { sub: String(decoded.sub), role: (decoded as { role: 'customer' | 'admin' }).role };
    }
    return null;
  } catch {
    return null;
  }
}
```

`apps/api/src/lib/authCookie.ts`:
```ts
import type { Response } from 'express';

export const AUTH_COOKIE = 'herencia_token';
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env['NODE_ENV'] === 'production',
    maxAge: MAX_AGE,
    path: '/',
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, { path: '/' });
}
```

`apps/api/src/middleware/auth.ts`:
```ts
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { HttpError } from './error';
import { verifyToken } from '../lib/jwt';
import { AUTH_COOKIE } from '../lib/authCookie';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; role: 'customer' | 'admin' };
    }
  }
}

export const authenticate: RequestHandler = (req: Request, _res: Response, next: NextFunction) => {
  const token = (req.cookies as Record<string, string> | undefined)?.[AUTH_COOKIE];
  if (token) {
    const payload = verifyToken(token);
    if (payload) req.user = { id: payload.sub, role: payload.role };
  }
  next();
};

export const requireAuth: RequestHandler = (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Authentication required', 'unauthorized'));
  next();
};

export function requireRole(role: 'customer' | 'admin'): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) return next(new HttpError(401, 'Authentication required', 'unauthorized'));
    if (req.user.role !== role) return next(new HttpError(403, 'Forbidden', 'forbidden'));
    next();
  };
}
```

`apps/api/src/test/auth.ts`:
```ts
import { signToken } from '../lib/jwt';
import { AUTH_COOKIE } from '../lib/authCookie';

export function authCookie(userId: string, role: 'customer' | 'admin'): string {
  return `${AUTH_COOKIE}=${signToken({ sub: userId, role })}`;
}
```

- [ ] **Step 5: Run jwt + middleware tests**

Run: `npm run test --workspace apps/api -- jwt auth`
Expected: PASS.

- [ ] **Step 6: Rewire `requireAdmin` to cookie/JWT + admin role**

Replace `apps/api/src/middleware/requireAdmin.ts`:
```ts
import type { RequestHandler } from 'express';
import { authenticate, requireRole } from './auth';

// Milestone 2: same seam name, JWT-cookie + admin-role internals (replaces the interim
// x-admin-token check). Mount as `router.use(requireAdmin)`.
const adminRole = requireRole('admin');
export const requireAdmin: RequestHandler = (req, res, next) => {
  authenticate(req, res, (err?: unknown) => {
    if (err) return next(err as Error);
    adminRole(req, res, next);
  });
};
```

- [ ] **Step 7: Drop `ADMIN_TOKEN` and thread out `adminToken`**

- `apps/api/src/config/env.ts`: remove the `ADMIN_TOKEN: z.string().min(16)` line (Zod ignores the now-unused key still present in `.env`).
- `apps/api/src/routes/admin.ts`: change `adminRouter(opts: { adminToken: string })` to `adminRouter()`; replace `router.use(requireAdmin(opts.adminToken))` with `router.use(requireAdmin)`.
- `apps/api/src/app.ts`: remove `adminToken` from `createApp` opts type; change mount to `app.use('/api/admin', adminRouter())`.
- `apps/api/src/server.ts`: remove `adminToken: env.ADMIN_TOKEN` from the `createApp({...})` call.

- [ ] **Step 8: Rewire existing api tests to cookie auth**

For every `createApp({ ..., adminToken: ... })` in tests, drop `adminToken`. In `apps/api/src/routes/admin.test.ts`:
- Remove `const TOKEN` and the `adminToken` arg.
- Add `import { authCookie } from '../test/auth';` and a constant `const ADMIN = authCookie('000000000000000000000001', 'admin');`.
- Replace every `.set('x-admin-token', TOKEN)` with `.set('Cookie', ADMIN)`.
- The "rejects requests without the admin token" test: keep asserting `401` (no cookie → `authenticate` sets no user → `requireRole` 401). Add one test asserting a **customer** cookie gets `403`:
```ts
it('rejects a non-admin user with 403', async () => {
  const res = await request(app).post('/api/admin/scent-families')
    .set('Cookie', authCookie('000000000000000000000002', 'customer')).send({ name: 'Woody' });
  expect(res.status).toBe(403);
});
```
In `catalog.test.ts`, `settings.test.ts`, `spa.test.ts`, `app.test.ts`: drop `adminToken` from their `createApp(...)` calls (grep first).

- [ ] **Step 9: Run the full api suite**

Run: `npm run test --workspace apps/api`
Expected: PASS (all suites green with cookie auth).

- [ ] **Step 10: Typecheck & commit**

Run: `npm run typecheck`
Expected: 0 errors.
```bash
git add apps/api package-lock.json apps/api/vitest.config.ts
git commit -m "feat(api): JWT httpOnly-cookie auth + role guards; rewire requireAdmin internals (drop x-admin-token)"
```

---

## Task 5: API — User model extension + auth routes

**Files:**
- Modify: `apps/api/src/models/User.ts` (addresses, wishlist)
- Modify: `apps/api/src/lib/serialize.ts` (add `toUserDTO`)
- Create: `apps/api/src/routes/auth.ts`
- Modify: `apps/api/src/app.ts` (mount `/api/auth`)
- Modify: `apps/api/src/seed.ts` (admin password + settings shipping)
- Test: `apps/api/src/routes/auth.test.ts`

**Interfaces:**
- Consumes: `registerSchema`, `loginSchema`, `UserDTO` (shared); `signToken`, `setAuthCookie`, `clearAuthCookie`, `authenticate`, `requireAuth`.
- Produces: `toUserDTO(doc): UserDTO`; routes `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`. The `User` model now carries `addresses: AddressSubdoc[]` and `wishlist: ObjectId[]`.

- [ ] **Step 1: Write the failing auth route tests**

`apps/api/src/routes/auth.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';

const app = createApp({ clientOrigin: 'http://localhost:5173' });

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

async function register(email = 'mai@x.com') {
  return request(app).post('/api/auth/register').send({ name: 'Mai', email, password: 'secret12' });
}

describe('POST /api/auth/register', () => {
  it('creates a user, sets a cookie, returns the user DTO', async () => {
    const res = await register();
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Mai', email: 'mai@x.com', role: 'customer' });
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie']?.[0]).toMatch(/herencia_token=/);
  });
  it('rejects a duplicate email with 409', async () => {
    await register();
    const res = await register();
    expect(res.status).toBe(409);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    await register();
    const res = await request(app).post('/api/auth/login').send({ email: 'mai@x.com', password: 'secret12' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toMatch(/herencia_token=/);
  });
  it('rejects a wrong password with 401', async () => {
    await register();
    const res = await request(app).post('/api/auth/login').send({ email: 'mai@x.com', password: 'wrong123' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('returns 401 when unauthenticated', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });
  it('returns the current user with the cookie', async () => {
    const reg = await register();
    const cookie = reg.headers['set-cookie'];
    const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('mai@x.com');
  });
});

describe('POST /api/auth/logout', () => {
  it('clears the cookie', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']?.[0]).toMatch(/herencia_token=;/);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test --workspace apps/api -- auth.test`
Expected: FAIL — `/api/auth/*` not mounted.

- [ ] **Step 3: Extend the User model**

Replace `apps/api/src/models/User.ts`:
```ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const addressSchema = new Schema(
  {
    label: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String },
    city: { type: String, required: true },
    governorate: { type: String, required: true },
    phone: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['customer', 'admin'], default: 'customer' },
    phone: { type: String },
    addresses: { type: [addressSchema], default: [] },
    wishlist: { type: [{ type: Schema.Types.ObjectId, ref: 'Product' }], default: [] },
  },
  { timestamps: true },
);

export type UserDoc = InferSchemaType<typeof userSchema>;
export const User =
  (mongoose.models.User as mongoose.Model<UserDoc>) ?? mongoose.model('User', userSchema);
```

- [ ] **Step 4: Add `toUserDTO`**

Append to `apps/api/src/lib/serialize.ts`:
```ts
import type { UserDTO } from '@herencia/shared';

export function toUserDTO(doc: AnyDoc): UserDTO {
  return {
    id: String(doc._id),
    name: doc.name,
    email: doc.email,
    role: doc.role,
    phone: doc.phone ?? undefined,
  };
}
```
(Add `UserDTO` to the existing top import from `@herencia/shared`.)

- [ ] **Step 5: Implement the auth routes**

`apps/api/src/routes/auth.ts`:
```ts
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { registerSchema, loginSchema } from '@herencia/shared';
import { User } from '../models/User';
import { HttpError } from '../middleware/error';
import { signToken } from '../lib/jwt';
import { setAuthCookie, clearAuthCookie } from '../lib/authCookie';
import { authenticate, requireAuth } from '../middleware/auth';
import { toUserDTO } from '../lib/serialize';

export function authRouter(): Router {
  const router = Router();

  router.post('/register', async (req, res, next) => {
    try {
      const parsed = registerSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const { name, email, password } = parsed.data;
      if (await User.exists({ email })) throw new HttpError(409, 'Email already registered', 'conflict');
      const passwordHash = await bcrypt.hash(password, 12);
      const user = await User.create({ name, email, passwordHash, role: 'customer' });
      setAuthCookie(res, signToken({ sub: String(user._id), role: 'customer' }));
      res.status(201).json(toUserDTO(user.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.post('/login', async (req, res, next) => {
    try {
      const parsed = loginSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const { email, password } = parsed.data;
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        throw new HttpError(401, 'Invalid email or password', 'invalid_credentials');
      }
      setAuthCookie(res, signToken({ sub: String(user._id), role: user.role as 'customer' | 'admin' }));
      res.json(toUserDTO(user.toObject()));
    } catch (err) {
      next(err);
    }
  });

  router.post('/logout', (_req, res) => {
    clearAuthCookie(res);
    res.json({ ok: true });
  });

  router.get('/me', authenticate, requireAuth, async (req, res, next) => {
    try {
      const user = await User.findById(req.user!.id).lean();
      if (!user) throw new HttpError(404, 'User not found', 'not_found');
      res.json(toUserDTO(user));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
```

Mount in `apps/api/src/app.ts` (add import + line before catalog):
```ts
import { authRouter } from './routes/auth';
// ...
app.use('/api/auth', authRouter());
```

- [ ] **Step 6: Run the auth tests**

Run: `npm run test --workspace apps/api -- auth.test`
Expected: PASS.

- [ ] **Step 7: Update the seed (admin password + settings shipping)**

In `apps/api/src/seed.ts`, ensure the admin `User` is created with `passwordHash = await bcrypt.hash('admin1234', 12)` and role `admin`, and the `Setting` singleton includes `shippingFee` (e.g. `50`) and `freeShippingThreshold` (e.g. `2000`). Keep the existing email `admin@herencia.example`. Run it to confirm:

Run: `npm run seed --workspace apps/api` (requires the Atlas `.env`; if unavailable in this environment, skip running but keep the code change.)

- [ ] **Step 8: Commit**

```bash
git add apps/api/src/models/User.ts apps/api/src/lib/serialize.ts apps/api/src/routes/auth.ts apps/api/src/routes/auth.test.ts apps/api/src/app.ts apps/api/src/seed.ts
git commit -m "feat(api): register/login/logout/me auth routes; User addresses+wishlist; admin password seed"
```

---

## Task 6: API — Cart model, pricing service, cart routes

**Files:**
- Create: `apps/api/src/models/Cart.ts`
- Create: `apps/api/src/modules/cart/service.ts`
- Create: `apps/api/src/routes/cart.ts`
- Modify: `apps/api/src/app.ts` (mount `/api/cart`)
- Test: `apps/api/src/modules/cart/service.test.ts`, `apps/api/src/routes/cart.test.ts`

**Interfaces:**
- Consumes: `priceCartSchema`, `setCartSchema`, `CartItemInput`, `PricedCartDTO` (shared); `Product`, `Setting` models; `authenticate`, `requireAuth`.
- Produces:
  - `priceItems(items: CartItemInput[]): Promise<PricedCartDTO>` (`modules/cart/service.ts`).
  - `Cart` model (`{ user: ObjectId unique, items: [{ product, sizeLabel, qty }] }`).
  - Routes: `POST /api/cart/price` (public), `GET /api/cart` (auth), `PUT /api/cart` (auth), `POST /api/cart/merge` (auth).

- [ ] **Step 1: Write the failing pricing-service test**

`apps/api/src/modules/cart/service.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectMemory, disconnectMemory, clearDb } from '../../test/db';
import { ScentFamily } from '../../models/ScentFamily';
import { Product } from '../../models/Product';
import { Setting } from '../../models/Setting';
import { priceItems } from './service';

beforeAll(connectMemory);
afterAll(disconnectMemory);

let productId: string;
beforeEach(async () => {
  await clearDb();
  await Setting.create({
    whatsappNumber: '201000000000', shippingFee: 50, freeShippingThreshold: 2000,
    hero: { title: 't', subtitle: 's', ctaText: 'c', ctaLink: '/', image: 'x' },
  });
  const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const p = await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['img1'],
    sizes: [{ label: '50ml', price: 800, stock: 3 }], scentFamily: fam._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  productId = String(p._id);
});

describe('priceItems', () => {
  it('recomputes line totals from the DB and adds shipping', async () => {
    const cart = await priceItems([{ productId, sizeLabel: '50ml', qty: 2 }]);
    expect(cart.subtotal).toBe(1600);
    expect(cart.shipping).toBe(50);
    expect(cart.total).toBe(1650);
    expect(cart.items[0]).toMatchObject({ unitPrice: 800, lineTotal: 1600, available: true, maxQty: 3 });
  });
  it('applies free shipping over the threshold', async () => {
    const cart = await priceItems([{ productId, sizeLabel: '50ml', qty: 3 }]); // 2400 ≥ 2000
    expect(cart.shipping).toBe(0);
    expect(cart.total).toBe(2400);
  });
  it('flags an out-of-stock / over-qty line as unavailable and excludes it from subtotal', async () => {
    const cart = await priceItems([{ productId, sizeLabel: '50ml', qty: 5 }]); // stock 3
    expect(cart.items[0].available).toBe(false);
    expect(cart.hasUnavailable).toBe(true);
    expect(cart.subtotal).toBe(0);
  });
  it('marks a missing product/size unavailable', async () => {
    const cart = await priceItems([{ productId, sizeLabel: '999ml', qty: 1 }]);
    expect(cart.items[0]).toMatchObject({ available: false, unitPrice: 0, maxQty: 0 });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace apps/api -- cart/service`
Expected: FAIL — `priceItems` missing.

- [ ] **Step 3: Implement the Cart model + pricing service**

`apps/api/src/models/Cart.ts`:
```ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const cartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    items: [
      {
        _id: false,
        product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
        sizeLabel: { type: String, required: true },
        qty: { type: Number, required: true, min: 1 },
      },
    ],
  },
  { timestamps: true },
);

export type CartDoc = InferSchemaType<typeof cartSchema>;
export const Cart =
  (mongoose.models.Cart as mongoose.Model<CartDoc>) ?? mongoose.model('Cart', cartSchema);
```

`apps/api/src/modules/cart/service.ts`:
```ts
import type { CartItemInput, PricedCartDTO, PricedCartLineDTO } from '@herencia/shared';
import { Product } from '../../models/Product';
import { Setting } from '../../models/Setting';

const round2 = (n: number): number => Math.round(n * 100) / 100;

export async function priceItems(items: CartItemInput[]): Promise<PricedCartDTO> {
  const ids = [...new Set(items.map((i) => i.productId))];
  const products = await Product.find({ _id: { $in: ids } }).lean();
  const byId = new Map(products.map((p) => [String(p._id), p]));

  const lines: PricedCartLineDTO[] = items.map((item) => {
    const p = byId.get(item.productId);
    const size = p?.sizes?.find((s) => s.label === item.sizeLabel);
    const active = !!p?.isActive;
    const maxQty = size?.stock ?? 0;
    const unitPrice = size?.price ?? 0;
    const available = active && !!size && item.qty <= maxQty && maxQty > 0;
    return {
      productId: item.productId,
      slug: p?.slug ?? '',
      name: p?.name ?? 'Unavailable item',
      image: p?.images?.[0] ?? '',
      sizeLabel: item.sizeLabel,
      unitPrice,
      qty: item.qty,
      lineTotal: available ? round2(unitPrice * item.qty) : 0,
      available,
      maxQty,
    };
  });

  const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));
  const setting = await Setting.findOne().lean();
  const fee = setting?.shippingFee ?? 0;
  const threshold = setting?.freeShippingThreshold;
  const shipping =
    subtotal === 0 ? 0 : threshold != null && subtotal >= threshold ? 0 : fee;
  return {
    items: lines,
    subtotal,
    shipping,
    total: round2(subtotal + shipping),
    hasUnavailable: lines.some((l) => !l.available),
  };
}
```

- [ ] **Step 4: Run the service test**

Run: `npm run test --workspace apps/api -- cart/service`
Expected: PASS.

- [ ] **Step 5: Write the failing cart-route tests**

`apps/api/src/routes/cart.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';
import { Setting } from '../models/Setting';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const USER = authCookie('000000000000000000000010', 'customer');

beforeAll(connectMemory);
afterAll(disconnectMemory);

let productId: string;
beforeEach(async () => {
  await clearDb();
  await Setting.create({
    whatsappNumber: '201000000000', shippingFee: 50, freeShippingThreshold: 2000,
    hero: { title: 't', subtitle: 's', ctaText: 'c', ctaLink: '/', image: 'x' },
  });
  const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const p = await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['img1'],
    sizes: [{ label: '50ml', price: 800, stock: 5 }], scentFamily: fam._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  productId = String(p._id);
});

describe('POST /api/cart/price (public)', () => {
  it('prices an anonymous cart', async () => {
    const res = await request(app).post('/api/cart/price').send({ items: [{ productId, sizeLabel: '50ml', qty: 2 }] });
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1650);
  });
  it('rejects an invalid body with 400', async () => {
    const res = await request(app).post('/api/cart/price').send({ items: [{ productId: 'x', sizeLabel: '', qty: 0 }] });
    expect(res.status).toBe(400);
  });
});

describe('GET/PUT /api/cart (auth)', () => {
  it('401s without a cookie', async () => {
    expect((await request(app).get('/api/cart')).status).toBe(401);
  });
  it('persists and returns a priced cart', async () => {
    const put = await request(app).put('/api/cart').set('Cookie', USER).send({ items: [{ productId, sizeLabel: '50ml', qty: 1 }] });
    expect(put.status).toBe(200);
    expect(put.body.total).toBe(850);
    const get = await request(app).get('/api/cart').set('Cookie', USER);
    expect(get.body.items).toHaveLength(1);
  });
});

describe('POST /api/cart/merge (auth)', () => {
  it('unions guest items into the stored cart, summing duplicate qty', async () => {
    await request(app).put('/api/cart').set('Cookie', USER).send({ items: [{ productId, sizeLabel: '50ml', qty: 1 }] });
    const res = await request(app).post('/api/cart/merge').set('Cookie', USER).send({ items: [{ productId, sizeLabel: '50ml', qty: 2 }] });
    expect(res.status).toBe(200);
    expect(res.body.items[0].qty).toBe(3);
  });
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `npm run test --workspace apps/api -- cart.test`
Expected: FAIL — `/api/cart` not mounted.

- [ ] **Step 7: Implement the cart routes**

`apps/api/src/routes/cart.ts`:
```ts
import { Router } from 'express';
import { priceCartSchema, setCartSchema, type CartItemInput } from '@herencia/shared';
import { Cart } from '../models/Cart';
import { HttpError } from '../middleware/error';
import { authenticate, requireAuth } from '../middleware/auth';
import { priceItems } from '../modules/cart/service';

type StoredItem = { product: unknown; sizeLabel: string; qty: number };
const toInputs = (items: StoredItem[]): CartItemInput[] =>
  items.map((i) => ({ productId: String(i.product), sizeLabel: i.sizeLabel, qty: i.qty }));
const toStored = (items: CartItemInput[]): StoredItem[] =>
  items.map((i) => ({ product: i.productId, sizeLabel: i.sizeLabel, qty: i.qty }));

export function cartRouter(): Router {
  const router = Router();

  router.post('/price', async (req, res, next) => {
    try {
      const parsed = priceCartSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      res.json(await priceItems(parsed.data.items));
    } catch (err) {
      next(err);
    }
  });

  router.use(authenticate, requireAuth);

  router.get('/', async (req, res, next) => {
    try {
      const cart = await Cart.findOne({ user: req.user!.id }).lean();
      res.json(await priceItems(cart ? toInputs(cart.items as StoredItem[]) : []));
    } catch (err) {
      next(err);
    }
  });

  router.put('/', async (req, res, next) => {
    try {
      const parsed = setCartSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      await Cart.findOneAndUpdate(
        { user: req.user!.id },
        { items: toStored(parsed.data.items) },
        { upsert: true, new: true },
      );
      res.json(await priceItems(parsed.data.items));
    } catch (err) {
      next(err);
    }
  });

  router.post('/merge', async (req, res, next) => {
    try {
      const parsed = setCartSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const existing = await Cart.findOne({ user: req.user!.id });
      const merged = new Map<string, CartItemInput>();
      const add = (i: CartItemInput) => {
        const key = `${i.productId}::${i.sizeLabel}`;
        const prev = merged.get(key);
        merged.set(key, prev ? { ...i, qty: Math.min(99, prev.qty + i.qty) } : i);
      };
      if (existing) toInputs(existing.items as StoredItem[]).forEach(add);
      parsed.data.items.forEach(add);
      const items = [...merged.values()];
      await Cart.findOneAndUpdate({ user: req.user!.id }, { items: toStored(items) }, { upsert: true });
      res.json(await priceItems(items));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
```

Mount in `apps/api/src/app.ts`:
```ts
import { cartRouter } from './routes/cart';
// ...
app.use('/api/cart', cartRouter());
```

- [ ] **Step 8: Run the cart route tests + typecheck**

Run: `npm run test --workspace apps/api -- cart.test`
Expected: PASS.
Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 9: Commit**

```bash
git add apps/api/src/models/Cart.ts apps/api/src/modules/cart apps/api/src/routes/cart.ts apps/api/src/routes/cart.test.ts apps/api/src/app.ts
git commit -m "feat(api): server-priced cart (price/get/put/merge) — never trusts client prices"
```

---

## Task 7: API — Order model, lib helpers, order service, customer routes

**Files:**
- Create: `apps/api/src/models/Order.ts`, `apps/api/src/lib/whatsapp.ts`, `apps/api/src/lib/orderNumber.ts`, `apps/api/src/modules/order/service.ts`
- Modify: `apps/api/src/lib/serialize.ts` (add `toOrderDTO`), `apps/api/src/app.ts` (mount `/api/orders`)
- Create: `apps/api/src/routes/orders.ts`
- Test: `apps/api/src/lib/whatsapp.test.ts`, `apps/api/src/modules/order/service.test.ts`, `apps/api/src/routes/orders.test.ts`

**Interfaces:**
- Consumes: `createOrderSchema`, `CreateOrderInput`, `OrderDTO`, `CreateOrderResultDTO` (shared); `priceItems`; `Product`, `Setting` models.
- Produces:
  - `buildWhatsAppUrl(number: string, order: { orderNumber, items, total, customer }): string`.
  - `generateOrderNumber(): string` (`HRC-` + sortable base36 + random suffix).
  - `createOrder(input: CreateOrderInput, userId?: string): Promise<CreateOrderResultDTO>` (`modules/order/service.ts`) — re-prices, blocks on unavailable lines, decrements stock atomically, snapshots items, builds WhatsApp URL.
  - `toOrderDTO(doc): OrderDTO`.
  - Routes: `POST /api/orders` (public; attaches user if logged in), `GET /api/orders/me` (auth).

- [ ] **Step 1: Write the failing whatsapp + service tests**

`apps/api/src/lib/whatsapp.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildWhatsAppUrl } from './whatsapp';

describe('buildWhatsAppUrl', () => {
  it('builds a wa.me url with an encoded order summary', () => {
    const url = buildWhatsAppUrl('+20 100 000 0000', {
      orderNumber: 'HRC-ABC', total: 1650,
      items: [{ name: 'Royal Oud', sizeLabel: '50ml', qty: 2 }],
      customer: { name: 'Mai' },
    });
    expect(url).toMatch(/^https:\/\/wa\.me\/201000000000\?text=/);
    expect(decodeURIComponent(url)).toContain('HRC-ABC');
    expect(decodeURIComponent(url)).toContain('Royal Oud');
  });
});
```

`apps/api/src/modules/order/service.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectMemory, disconnectMemory, clearDb } from '../../test/db';
import { ScentFamily } from '../../models/ScentFamily';
import { Product } from '../../models/Product';
import { Setting } from '../../models/Setting';
import { createOrder } from './service';

beforeAll(connectMemory);
afterAll(disconnectMemory);

let productId: string;
beforeEach(async () => {
  await clearDb();
  await Setting.create({
    whatsappNumber: '201000000000', shippingFee: 50, freeShippingThreshold: 2000,
    hero: { title: 't', subtitle: 's', ctaText: 'c', ctaLink: '/', image: 'x' },
  });
  const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const p = await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['img1'],
    sizes: [{ label: '50ml', price: 800, stock: 3 }], scentFamily: fam._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  productId = String(p._id);
});

const input = (qty: number) => ({
  items: [{ productId, sizeLabel: '50ml', qty }],
  customer: { name: 'Mai', phone: '0100000000' },
  shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '0100000000' },
});

describe('createOrder', () => {
  it('creates a pending COD order, snapshots items, decrements stock, returns a whatsapp url', async () => {
    const { order, whatsappUrl } = await createOrder(input(2));
    expect(order.status).toBe('pending');
    expect(order.paymentMethod).toBe('cod');
    expect(order.subtotal).toBe(1600);
    expect(order.total).toBe(1650);
    expect(order.items[0]).toMatchObject({ name: 'Royal Oud', unitPrice: 800, qty: 2 });
    expect(order.orderNumber).toMatch(/^HRC-/);
    expect(whatsappUrl).toContain('wa.me');
    const after = await Product.findById(productId).lean();
    expect(after!.sizes[0]!.stock).toBe(1);
  });
  it('throws 409 when a line exceeds stock', async () => {
    await expect(createOrder(input(5))).rejects.toMatchObject({ status: 409 });
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npm run test --workspace apps/api -- whatsapp order/service`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement lib helpers**

`apps/api/src/lib/whatsapp.ts`:
```ts
type Summary = {
  orderNumber: string;
  total: number;
  items: { name: string; sizeLabel: string; qty: number }[];
  customer: { name: string };
};

export function buildWhatsAppUrl(rawNumber: string, order: Summary): string {
  const number = rawNumber.replace(/\D/g, '');
  const lines = [
    `New HERENCIA order ${order.orderNumber}`,
    `Customer: ${order.customer.name}`,
    '',
    ...order.items.map((i) => `• ${i.name} (${i.sizeLabel}) ×${i.qty}`),
    '',
    `Total: EGP ${order.total.toFixed(2)} (Cash on Delivery)`,
  ];
  return `https://wa.me/${number}?text=${encodeURIComponent(lines.join('\n'))}`;
}
```

`apps/api/src/lib/orderNumber.ts`:
```ts
export function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `HRC-${ts}-${rand}`;
}
```

- [ ] **Step 4: Implement the Order model + service + `toOrderDTO`**

`apps/api/src/models/Order.ts`:
```ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { ORDER_STATUS } from '@herencia/shared';

const orderItemSchema = new Schema(
  {
    product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    sizeLabel: { type: String, required: true },
    unitPrice: { type: Number, required: true },
    qty: { type: Number, required: true, min: 1 },
    image: { type: String, default: '' },
  },
  { _id: false },
);

const orderSchema = new Schema(
  {
    orderNumber: { type: String, required: true, unique: true, index: true },
    items: { type: [orderItemSchema], required: true },
    customer: {
      name: { type: String, required: true },
      phone: { type: String, required: true },
      email: { type: String },
    },
    shippingAddress: {
      line1: { type: String, required: true },
      line2: { type: String },
      city: { type: String, required: true },
      governorate: { type: String, required: true },
      phone: { type: String, required: true },
    },
    subtotal: { type: Number, required: true },
    shipping: { type: Number, required: true },
    total: { type: Number, required: true },
    status: { type: String, enum: [...ORDER_STATUS], default: 'pending', index: true },
    paymentMethod: { type: String, enum: ['cod'], default: 'cod' },
    notes: { type: String },
    user: { type: Schema.Types.ObjectId, ref: 'User', index: true },
  },
  { timestamps: true },
);

export type OrderDoc = InferSchemaType<typeof orderSchema>;
export const Order =
  (mongoose.models.Order as mongoose.Model<OrderDoc>) ?? mongoose.model('Order', orderSchema);
```

`apps/api/src/modules/order/service.ts`:
```ts
import type { CreateOrderInput, CreateOrderResultDTO } from '@herencia/shared';
import { Product } from '../../models/Product';
import { Setting } from '../../models/Setting';
import { Order } from '../../models/Order';
import { HttpError } from '../../middleware/error';
import { priceItems } from '../cart/service';
import { buildWhatsAppUrl } from '../../lib/whatsapp';
import { generateOrderNumber } from '../../lib/orderNumber';
import { toOrderDTO } from '../../lib/serialize';

export async function createOrder(input: CreateOrderInput, userId?: string): Promise<CreateOrderResultDTO> {
  const priced = await priceItems(input.items);
  if (priced.hasUnavailable || priced.items.length === 0) {
    throw new HttpError(409, 'Some items are unavailable or out of stock', 'cart_unavailable', {
      items: priced.items.filter((i) => !i.available),
    });
  }

  // Atomically decrement stock; roll back on any failure to avoid oversell.
  const decremented: { id: string; label: string; qty: number }[] = [];
  for (const line of priced.items) {
    const r = await Product.updateOne(
      { _id: line.productId, sizes: { $elemMatch: { label: line.sizeLabel, stock: { $gte: line.qty } } } },
      { $inc: { 'sizes.$.stock': -line.qty } },
    );
    if (r.modifiedCount !== 1) {
      for (const d of decremented) {
        await Product.updateOne({ _id: d.id, 'sizes.label': d.label }, { $inc: { 'sizes.$.stock': d.qty } });
      }
      throw new HttpError(409, 'Stock changed during checkout, please review your cart', 'stock_conflict');
    }
    decremented.push({ id: line.productId, label: line.sizeLabel, qty: line.qty });
  }

  const setting = await Setting.findOne().lean();
  const doc = await Order.create({
    orderNumber: generateOrderNumber(),
    items: priced.items.map((l) => ({
      product: l.productId, name: l.name, sizeLabel: l.sizeLabel, unitPrice: l.unitPrice, qty: l.qty, image: l.image,
    })),
    customer: input.customer,
    shippingAddress: input.shippingAddress,
    subtotal: priced.subtotal,
    shipping: priced.shipping,
    total: priced.total,
    status: 'pending',
    paymentMethod: 'cod',
    notes: input.notes,
    user: userId,
  });

  const order = toOrderDTO(doc.toObject());
  const whatsappUrl = buildWhatsAppUrl(setting?.whatsappNumber ?? '', order);
  return { order, whatsappUrl };
}
```

Append `toOrderDTO` to `apps/api/src/lib/serialize.ts` (add `OrderDTO` to the shared import):
```ts
import type { OrderDTO } from '@herencia/shared';

export function toOrderDTO(doc: AnyDoc): OrderDTO {
  return {
    id: String(doc._id),
    orderNumber: doc.orderNumber,
    items: (doc.items ?? []).map((i: AnyDoc) => ({
      product: String(i.product), name: i.name, sizeLabel: i.sizeLabel,
      unitPrice: i.unitPrice, qty: i.qty, image: i.image ?? '',
    })),
    customer: { name: doc.customer.name, phone: doc.customer.phone, email: doc.customer.email ?? undefined },
    shippingAddress: {
      line1: doc.shippingAddress.line1, line2: doc.shippingAddress.line2 ?? undefined,
      city: doc.shippingAddress.city, governorate: doc.shippingAddress.governorate, phone: doc.shippingAddress.phone,
    },
    subtotal: doc.subtotal, shipping: doc.shipping, total: doc.total,
    status: doc.status, paymentMethod: 'cod', notes: doc.notes ?? undefined,
    createdAt: (doc.createdAt instanceof Date ? doc.createdAt : new Date(doc.createdAt)).toISOString(),
  };
}
```

- [ ] **Step 5: Run the whatsapp + service tests**

Run: `npm run test --workspace apps/api -- whatsapp order/service`
Expected: PASS.

- [ ] **Step 6: Write the failing order-route tests**

`apps/api/src/routes/orders.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';
import { Setting } from '../models/Setting';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const USER_ID = '000000000000000000000020';
const USER = authCookie(USER_ID, 'customer');

beforeAll(connectMemory);
afterAll(disconnectMemory);

let productId: string;
beforeEach(async () => {
  await clearDb();
  await Setting.create({
    whatsappNumber: '201000000000', shippingFee: 50, freeShippingThreshold: 2000,
    hero: { title: 't', subtitle: 's', ctaText: 'c', ctaLink: '/', image: 'x' },
  });
  const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const p = await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['img1'],
    sizes: [{ label: '50ml', price: 800, stock: 3 }], scentFamily: fam._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  productId = String(p._id);
});

const body = (qty: number) => ({
  items: [{ productId, sizeLabel: '50ml', qty }],
  customer: { name: 'Mai', phone: '0100000000' },
  shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '0100000000' },
});

describe('POST /api/orders', () => {
  it('creates a guest order and returns order + whatsappUrl', async () => {
    const res = await request(app).post('/api/orders').send(body(1));
    expect(res.status).toBe(201);
    expect(res.body.order.orderNumber).toMatch(/^HRC-/);
    expect(res.body.whatsappUrl).toContain('wa.me');
  });
  it('rejects an over-stock order with 409', async () => {
    const res = await request(app).post('/api/orders').send(body(9));
    expect(res.status).toBe(409);
  });
  it('rejects an invalid body with 400', async () => {
    const res = await request(app).post('/api/orders').send({ items: [] });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/orders/me', () => {
  it('401s for a guest', async () => {
    expect((await request(app).get('/api/orders/me')).status).toBe(401);
  });
  it('lists the logged-in user’s orders newest first', async () => {
    await request(app).post('/api/orders').set('Cookie', USER).send(body(1));
    const res = await request(app).get('/api/orders/me').set('Cookie', USER);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].customer.name).toBe('Mai');
  });
});
```

- [ ] **Step 7: Run to verify it fails**

Run: `npm run test --workspace apps/api -- orders.test`
Expected: FAIL — `/api/orders` not mounted.

- [ ] **Step 8: Implement the order routes**

`apps/api/src/routes/orders.ts`:
```ts
import { Router } from 'express';
import { createOrderSchema } from '@herencia/shared';
import { HttpError } from '../middleware/error';
import { authenticate, requireAuth } from '../middleware/auth';
import { createOrder } from '../modules/order/service';
import { Order } from '../models/Order';
import { toOrderDTO } from '../lib/serialize';

export function orderRouter(): Router {
  const router = Router();

  // Public checkout — attaches the user when a valid cookie is present.
  router.post('/', authenticate, async (req, res, next) => {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const result = await createOrder(parsed.data, req.user?.id);
      res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', authenticate, requireAuth, async (req, res, next) => {
    try {
      const docs = await Order.find({ user: req.user!.id }).sort({ createdAt: -1 }).lean();
      res.json({ items: docs.map(toOrderDTO), total: docs.length, page: 1, pages: 1 });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
```

Mount in `apps/api/src/app.ts`:
```ts
import { orderRouter } from './routes/orders';
// ...
app.use('/api/orders', orderRouter());
```

- [ ] **Step 9: Run the order tests + typecheck**

Run: `npm run test --workspace apps/api -- orders.test`
Expected: PASS.
Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 10: Commit**

```bash
git add apps/api/src/models/Order.ts apps/api/src/lib/whatsapp.ts apps/api/src/lib/whatsapp.test.ts apps/api/src/lib/orderNumber.ts apps/api/src/modules/order apps/api/src/lib/serialize.ts apps/api/src/routes/orders.ts apps/api/src/routes/orders.test.ts apps/api/src/app.ts
git commit -m "feat(api): COD order creation (server-priced, stock-safe) + WhatsApp link + customer orders"
```

---

## Task 8: API — Admin order management + status lifecycle

**Files:**
- Modify: `apps/api/src/routes/admin.ts` (add order list + status routes)
- Test: `apps/api/src/routes/admin.test.ts` (extend) or new `apps/api/src/routes/adminOrders.test.ts`

**Interfaces:**
- Consumes: `updateOrderStatusSchema`, `ORDER_STATUS_TRANSITIONS`, `ORDER_STATUS` (shared); `Order`, `toOrderDTO`; `requireAdmin` (already mounted on the admin router).
- Produces: `GET /api/admin/orders?status=&page=&limit=` (paginated), `PUT /api/admin/orders/:id/status` (validated transition).

- [ ] **Step 1: Write the failing admin-orders tests**

`apps/api/src/routes/adminOrders.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { Order } from '../models/Order';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const ADMIN = authCookie('000000000000000000000001', 'admin');
const CUSTOMER = authCookie('000000000000000000000002', 'customer');

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

async function seedOrder(status = 'pending') {
  return Order.create({
    orderNumber: `HRC-${status}-${Math.random().toString(36).slice(2, 6)}`,
    items: [{ product: '000000000000000000000099', name: 'X', sizeLabel: '50ml', unitPrice: 800, qty: 1, image: '' }],
    customer: { name: 'Mai', phone: '0100000000' },
    shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '0100000000' },
    subtotal: 800, shipping: 50, total: 850, status, paymentMethod: 'cod',
  });
}

describe('GET /api/admin/orders', () => {
  it('403s for a customer', async () => {
    expect((await request(app).get('/api/admin/orders').set('Cookie', CUSTOMER)).status).toBe(403);
  });
  it('lists orders and filters by status', async () => {
    await seedOrder('pending');
    await seedOrder('shipped');
    const all = await request(app).get('/api/admin/orders').set('Cookie', ADMIN);
    expect(all.body.total).toBe(2);
    const shipped = await request(app).get('/api/admin/orders?status=shipped').set('Cookie', ADMIN);
    expect(shipped.body.total).toBe(1);
    expect(shipped.body.items[0].status).toBe('shipped');
  });
});

describe('PUT /api/admin/orders/:id/status', () => {
  it('advances pending → confirmed', async () => {
    const o = await seedOrder('pending');
    const res = await request(app).put(`/api/admin/orders/${o._id}/status`).set('Cookie', ADMIN).send({ status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
  });
  it('rejects an illegal transition delivered → pending with 422', async () => {
    const o = await seedOrder('delivered');
    const res = await request(app).put(`/api/admin/orders/${o._id}/status`).set('Cookie', ADMIN).send({ status: 'pending' });
    expect(res.status).toBe(422);
  });
  it('404s an unknown order id', async () => {
    const res = await request(app).put('/api/admin/orders/000000000000000000000abc/status').set('Cookie', ADMIN).send({ status: 'confirmed' });
    expect(res.status).toBe(404);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace apps/api -- adminOrders`
Expected: FAIL — routes missing.

- [ ] **Step 3: Implement the admin order routes**

In `apps/api/src/routes/admin.ts`: add imports
```ts
import { updateOrderStatusSchema, ORDER_STATUS, ORDER_STATUS_TRANSITIONS, type OrderStatus } from '@herencia/shared';
import { Order } from '../models/Order';
import { toOrderDTO } from '../lib/serialize';
```
and add these routes (inside `adminRouter`, before `return router;`):
```ts
// ---- Orders ----
router.get('/orders', async (req, res, next) => {
  try {
    const status = req.query['status'];
    const filter: Record<string, unknown> = {};
    if (typeof status === 'string') {
      if (!ORDER_STATUS.includes(status as OrderStatus)) throw new HttpError(400, 'Invalid status', 'invalid');
      filter['status'] = status;
    }
    const page = Math.max(1, Number(req.query['page'] ?? 1) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query['limit'] ?? 20) || 20));
    const [docs, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ items: docs.map(toOrderDTO), total, page, pages: Math.ceil(total / limit) || 1 });
  } catch (err) {
    next(err);
  }
});

router.put('/orders/:id/status', async (req, res, next) => {
  try {
    const parsed = updateOrderStatusSchema.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
    const order = await Order.findById(req.params['id']);
    if (!order) throw new HttpError(404, 'Order not found', 'not_found');
    const from = order.status as OrderStatus;
    const to = parsed.data.status;
    if (from !== to && !ORDER_STATUS_TRANSITIONS[from].includes(to)) {
      throw new HttpError(422, `Cannot move an order from ${from} to ${to}`, 'invalid_transition');
    }
    order.status = to;
    await order.save();
    res.json(toOrderDTO(order.toObject()));
  } catch (err) {
    next(err);
  }
});
```
> Note: a malformed `:id` is caught by the existing `errorHandler` CastError→400 mapping (consistent with the existing product routes).

- [ ] **Step 4: Run the admin-orders tests + full api suite**

Run: `npm run test --workspace apps/api -- adminOrders`
Expected: PASS.
Run: `npm run test --workspace apps/api`
Expected: PASS (whole api suite green).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/routes/admin.ts apps/api/src/routes/adminOrders.test.ts
git commit -m "feat(api): admin order list (filter/paginate) + guarded status lifecycle transitions"
```

---

## Task 9: API — Account routes (profile, addresses, wishlist)

**Files:**
- Create: `apps/api/src/routes/account.ts`
- Modify: `apps/api/src/lib/serialize.ts` (add `toAddressDTO`)
- Modify: `apps/api/src/app.ts` (mount `/api/account`)
- Test: `apps/api/src/routes/account.test.ts`

**Interfaces:**
- Consumes: `updateProfileSchema`, `addressSchema`, `wishlistItemSchema`, `AddressDTO`, `UserDTO` (shared); `User` model; `authenticate`, `requireAuth`; `toUserDTO`.
- Produces:
  - `toAddressDTO(subdoc): AddressDTO`.
  - `GET /api/account/profile`, `PUT /api/account/profile`.
  - `GET /api/account/addresses`, `POST /api/account/addresses`, `PUT /api/account/addresses/:id`, `DELETE /api/account/addresses/:id`.
  - `GET /api/account/wishlist` (populated `ProductDTO[]`), `POST /api/account/wishlist` (`{ productId }`), `DELETE /api/account/wishlist/:productId`.

- [ ] **Step 1: Write the failing account tests**

`apps/api/src/routes/account.test.ts`:
```ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { User } from '../models/User';
import { ScentFamily } from '../models/ScentFamily';
import { Product } from '../models/Product';
import { authCookie } from '../test/auth';

const app = createApp({ clientOrigin: 'http://localhost:5173' });

beforeAll(connectMemory);
afterAll(disconnectMemory);

let cookie: string;
let userId: string;
let productId: string;
beforeEach(async () => {
  await clearDb();
  const u = await User.create({ name: 'Mai', email: 'mai@x.com', passwordHash: 'x', role: 'customer' });
  userId = String(u._id);
  cookie = authCookie(userId, 'customer');
  const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  const p = await Product.create({
    name: 'Royal Oud', type: 'perfume', shortDesc: 's', description: 'd', images: ['img1'],
    sizes: [{ label: '50ml', price: 800, stock: 5 }], scentFamily: fam._id,
    notes: { top: [], heart: [], base: [] }, gender: 'unisex', concentration: 'EDP',
  });
  productId = String(p._id);
});

describe('profile', () => {
  it('gets and updates the profile', async () => {
    const get = await request(app).get('/api/account/profile').set('Cookie', cookie);
    expect(get.body.email).toBe('mai@x.com');
    const put = await request(app).put('/api/account/profile').set('Cookie', cookie).send({ name: 'Mai K', phone: '0111' });
    expect(put.status).toBe(400); // phone too short → schema rejects
    const ok = await request(app).put('/api/account/profile').set('Cookie', cookie).send({ name: 'Mai K' });
    expect(ok.body.name).toBe('Mai K');
  });
});

describe('addresses', () => {
  const addr = { label: 'Home', line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '0100000000' };
  it('adds, lists, updates, deletes an address', async () => {
    const add = await request(app).post('/api/account/addresses').set('Cookie', cookie).send(addr);
    expect(add.status).toBe(201);
    const id = add.body.id;
    expect(id).toBeTruthy();
    const list = await request(app).get('/api/account/addresses').set('Cookie', cookie);
    expect(list.body).toHaveLength(1);
    const upd = await request(app).put(`/api/account/addresses/${id}`).set('Cookie', cookie).send({ ...addr, city: 'Giza' });
    expect(upd.body.find((a: { id: string; city: string }) => a.id === id).city).toBe('Giza');
    const del = await request(app).delete(`/api/account/addresses/${id}`).set('Cookie', cookie);
    expect(del.status).toBe(200);
    expect(del.body).toHaveLength(0);
  });
});

describe('wishlist', () => {
  it('adds (idempotent), lists populated, removes', async () => {
    await request(app).post('/api/account/wishlist').set('Cookie', cookie).send({ productId });
    await request(app).post('/api/account/wishlist').set('Cookie', cookie).send({ productId }); // idempotent
    const list = await request(app).get('/api/account/wishlist').set('Cookie', cookie);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].slug).toBe('royal-oud');
    const del = await request(app).delete(`/api/account/wishlist/${productId}`).set('Cookie', cookie);
    expect(del.body).toHaveLength(0);
  });
  it('401s a guest', async () => {
    expect((await request(app).get('/api/account/wishlist')).status).toBe(401);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test --workspace apps/api -- account.test`
Expected: FAIL — `/api/account` not mounted.

- [ ] **Step 3: Add `toAddressDTO`**

Append to `apps/api/src/lib/serialize.ts` (add `AddressDTO` to the shared import):
```ts
import type { AddressDTO } from '@herencia/shared';

export function toAddressDTO(a: AnyDoc): AddressDTO {
  return {
    id: String(a._id),
    label: a.label, line1: a.line1, line2: a.line2 ?? undefined,
    city: a.city, governorate: a.governorate, phone: a.phone, isDefault: !!a.isDefault,
  };
}
```

- [ ] **Step 4: Implement the account routes**

`apps/api/src/routes/account.ts`:
```ts
import { Router } from 'express';
import { updateProfileSchema, addressSchema, wishlistItemSchema } from '@herencia/shared';
import { User } from '../models/User';
import { HttpError } from '../middleware/error';
import { authenticate, requireAuth } from '../middleware/auth';
import { toUserDTO, toAddressDTO, toProductDTO } from '../lib/serialize';

export function accountRouter(): Router {
  const router = Router();
  router.use(authenticate, requireAuth);

  router.get('/profile', async (req, res, next) => {
    try {
      const user = await User.findById(req.user!.id).lean();
      if (!user) throw new HttpError(404, 'User not found', 'not_found');
      res.json(toUserDTO(user));
    } catch (err) {
      next(err);
    }
  });

  router.put('/profile', async (req, res, next) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const user = await User.findByIdAndUpdate(req.user!.id, parsed.data, { new: true }).lean();
      if (!user) throw new HttpError(404, 'User not found', 'not_found');
      res.json(toUserDTO(user));
    } catch (err) {
      next(err);
    }
  });

  const listAddresses = async (userId: string) => {
    const user = await User.findById(userId).lean();
    return (user?.addresses ?? []).map(toAddressDTO);
  };

  router.get('/addresses', async (req, res, next) => {
    try {
      res.json(await listAddresses(req.user!.id));
    } catch (err) {
      next(err);
    }
  });

  router.post('/addresses', async (req, res, next) => {
    try {
      const parsed = addressSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const user = await User.findById(req.user!.id);
      if (!user) throw new HttpError(404, 'User not found', 'not_found');
      if (parsed.data.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
      user.addresses.push(parsed.data);
      await user.save();
      const created = user.addresses[user.addresses.length - 1]!;
      res.status(201).json(toAddressDTO(created));
    } catch (err) {
      next(err);
    }
  });

  router.put('/addresses/:id', async (req, res, next) => {
    try {
      const parsed = addressSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      const user = await User.findById(req.user!.id);
      if (!user) throw new HttpError(404, 'User not found', 'not_found');
      const addr = user.addresses.id(req.params['id']);
      if (!addr) throw new HttpError(404, 'Address not found', 'not_found');
      if (parsed.data.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
      addr.set(parsed.data);
      await user.save();
      res.json(user.addresses.map(toAddressDTO));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/addresses/:id', async (req, res, next) => {
    try {
      const user = await User.findById(req.user!.id);
      if (!user) throw new HttpError(404, 'User not found', 'not_found');
      const addr = user.addresses.id(req.params['id']);
      if (addr) addr.deleteOne();
      await user.save();
      res.json(user.addresses.map(toAddressDTO));
    } catch (err) {
      next(err);
    }
  });

  router.get('/wishlist', async (req, res, next) => {
    try {
      const user = await User.findById(req.user!.id).populate({ path: 'wishlist', populate: { path: 'scentFamily' } }).lean();
      res.json((user?.wishlist ?? []).map((p: unknown) => toProductDTO(p as Record<string, unknown>)));
    } catch (err) {
      next(err);
    }
  });

  router.post('/wishlist', async (req, res, next) => {
    try {
      const parsed = wishlistItemSchema.safeParse(req.body);
      if (!parsed.success) throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Invalid', 'invalid');
      await User.updateOne({ _id: req.user!.id }, { $addToSet: { wishlist: parsed.data.productId } });
      res.status(201).json({ ok: true });
    } catch (err) {
      next(err);
    }
  });

  router.delete('/wishlist/:productId', async (req, res, next) => {
    try {
      await User.updateOne({ _id: req.user!.id }, { $pull: { wishlist: req.params['productId'] } });
      const user = await User.findById(req.user!.id).populate({ path: 'wishlist', populate: { path: 'scentFamily' } }).lean();
      res.json((user?.wishlist ?? []).map((p: unknown) => toProductDTO(p as Record<string, unknown>)));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
```
> `user.addresses.id(...)` / `.deleteOne()` require the Mongoose `DocumentArray` typing — use the model instance (not `.lean()`) as written. If TS complains about `addresses` subdoc methods, cast via `user.addresses as unknown as mongoose.Types.DocumentArray<...>` following the existing `serialize.ts` `AnyDoc` precedent; keep it minimal.

Mount in `apps/api/src/app.ts`:
```ts
import { accountRouter } from './routes/account';
// ...
app.use('/api/account', accountRouter());
```

- [ ] **Step 5: Run account tests + full api suite + typecheck**

Run: `npm run test --workspace apps/api -- account.test`
Expected: PASS.
Run: `npm run test --workspace apps/api` then `npm run typecheck`
Expected: PASS / 0 errors.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/routes/account.ts apps/api/src/routes/account.test.ts apps/api/src/lib/serialize.ts apps/api/src/app.ts
git commit -m "feat(api): account profile, addresses CRUD, and wishlist routes"
```

---

## Task 10: Web — Auth context, login/register, admin guard

**Files:**
- Modify: `apps/web/src/lib/api.ts` (auth client fns + DTO imports)
- Create: `apps/web/src/features/auth/AuthContext.tsx`, `apps/web/src/features/auth/RequireAuth.tsx`, `apps/web/src/features/auth/RequireAdmin.tsx`
- Create: `apps/web/src/pages/Login.tsx`, `apps/web/src/pages/Register.tsx`
- Modify: `apps/web/src/features/admin/adminClient.ts` (drop `x-admin-token`)
- Modify: `apps/web/src/pages/admin/AdminApp.tsx` (use `RequireAdmin` instead of `AdminTokenGate`)
- Delete: `apps/web/src/features/admin/AdminTokenGate.tsx`
- Modify: `apps/web/src/main.tsx` (wrap `AuthProvider`), `apps/web/src/app/router.tsx` (login/register routes), `apps/web/src/app/StorefrontLayout.tsx` (account/login nav)
- Test: `apps/web/src/features/auth/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `UserDTO`, `LoginInput`, `RegisterInput` (shared); `apiGet`, `apiSend`.
- Produces:
  - api client: `login(input): Promise<UserDTO>`, `register(input): Promise<UserDTO>`, `logout(): Promise<void>`, `fetchMe(): Promise<UserDTO>`.
  - `AuthProvider`, `useAuth()` → `{ user: UserDTO | null, loading: boolean, login, register, logout, refresh }`.
  - `<RequireAuth>`, `<RequireAdmin>` route-guard components (redirect to `/login`).

- [ ] **Step 1: Add the auth client fns**

Append to `apps/web/src/lib/api.ts` (extend the top import with `UserDTO, LoginInput, RegisterInput`):
```ts
export const login = (input: LoginInput) => apiSend<UserDTO>('POST', '/api/auth/login', input);
export const register = (input: RegisterInput) => apiSend<UserDTO>('POST', '/api/auth/register', input);
export const logout = () => apiSend<void>('POST', '/api/auth/logout');
export const fetchMe = () => apiGet<UserDTO>('/api/auth/me');
```

- [ ] **Step 2: Write the failing AuthContext test**

`apps/web/src/features/auth/AuthContext.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import * as api from '../../lib/api';

function Probe() {
  const { user, loading } = useAuth();
  if (loading) return <span>loading</span>;
  return <span>{user ? user.email : 'anon'}</span>;
}

describe('AuthContext', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('shows anon when /me 401s', async () => {
    vi.spyOn(api, 'fetchMe').mockRejectedValue(new api.ApiError(401, 'no'));
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('anon')).toBeInTheDocument());
  });
  it('shows the user when /me resolves', async () => {
    vi.spyOn(api, 'fetchMe').mockResolvedValue({ id: '1', name: 'Mai', email: 'mai@x.com', role: 'customer' });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByText('mai@x.com')).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test --workspace apps/web -- AuthContext`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement AuthContext + guards + pages**

`apps/web/src/features/auth/AuthContext.tsx`:
```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { UserDTO, LoginInput, RegisterInput } from '@herencia/shared';
import * as api from '../../lib/api';

type AuthValue = {
  user: UserDTO | null;
  loading: boolean;
  login: (input: LoginInput) => Promise<UserDTO>;
  register: (input: RegisterInput) => Promise<UserDTO>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDTO | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      setUser(await api.fetchMe());
    } catch {
      setUser(null);
    }
  };

  useEffect(() => {
    void refresh().finally(() => setLoading(false));
  }, []);

  const login = async (input: LoginInput) => {
    const u = await api.login(input);
    setUser(u);
    return u;
  };
  const register = async (input: RegisterInput) => {
    const u = await api.register(input);
    setUser(u);
    return u;
  };
  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  return <AuthCtx.Provider value={{ user, loading, login, register, logout, refresh }}>{children}</AuthCtx.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

`apps/web/src/features/auth/RequireAuth.tsx`:
```tsx
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="py-24 text-center font-body text-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return <>{children}</>;
}
```

`apps/web/src/features/auth/RequireAdmin.tsx`:
```tsx
import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="py-24 text-center font-body text-muted">Loading…</div>;
  if (!user) return <Navigate to="/login" state={{ from: '/admin' }} replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}
```

`apps/web/src/pages/Login.tsx`:
```tsx
import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { ApiError } from '../lib/api';
import { Button } from '../components/Button';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await login({ email, password });
      navigate(location.state?.from ?? (user.role === 'admin' ? '/admin' : '/account'), { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-sm py-16">
      <h1 className="mb-6 font-display text-2xl text-content">Sign in</h1>
      {error && <p className="mb-3 font-body text-sm text-red-500">{error}</p>}
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" aria-label="Email"
        className="mb-3 w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content" />
      <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" aria-label="Password"
        className="mb-4 w-full rounded-md border border-line bg-bg px-3 py-2 font-body text-content" />
      <Button type="submit" disabled={busy} className="w-full">{busy ? 'Signing in…' : 'Sign in'}</Button>
      <p className="mt-4 font-body text-sm text-muted">No account? <Link to="/register" className="text-accent">Create one</Link></p>
    </form>
  );
}
```

`apps/web/src/pages/Register.tsx`: same shape as `Login`, with an added `name` field, calling `register({ name, email, password })` and navigating to `/account` on success. (Mirror Login’s structure exactly; add the name input first.)

- [ ] **Step 5: Replace the admin gate + drop the token client**

- `apps/web/src/features/admin/adminClient.ts`: remove `KEY`, `getAdminToken`, `setAdminToken`, `adminHeaders`, and the `, adminHeaders()` argument from every `apiSend` call (cookies now carry auth via `credentials: 'include'`). Keep `uploadImage`/`adminSignUpload` (drop the `adminHeaders()` arg on `adminSignUpload`).
- `apps/web/src/pages/admin/AdminApp.tsx`: replace `<AdminTokenGate>` wrapper with `<RequireAdmin>` (import from `../../features/auth/RequireAdmin`). Add a logout button calling `useAuth().logout()`.
- Delete `apps/web/src/features/admin/AdminTokenGate.tsx` and its test if present (`git rm`).

- [ ] **Step 6: Wire providers, routes, nav**

- `apps/web/src/main.tsx`: wrap the router in `<AuthProvider>` (outermost, inside React Query provider).
- `apps/web/src/app/router.tsx`: add `{ path: '/login', element: <Login /> }` and `{ path: '/register', element: <Register /> }` under `StorefrontLayout` (lazy-import both).
- `apps/web/src/app/StorefrontLayout.tsx`: add nav links — when `useAuth().user` is null show **Sign in** (`/login`); when set show **Account** (`/account`) + a logout button. (StorefrontLayout must be rendered within `AuthProvider` — it is, via main.tsx.)

- [ ] **Step 7: Run the web suite + typecheck + build**

Run: `npm run test --workspace apps/web -- AuthContext`
Expected: PASS.
Run: `npm run typecheck && npm run build`
Expected: 0 errors; build succeeds.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/features/auth apps/web/src/pages/Login.tsx apps/web/src/pages/Register.tsx apps/web/src/features/admin/adminClient.ts apps/web/src/pages/admin/AdminApp.tsx apps/web/src/main.tsx apps/web/src/app/router.tsx apps/web/src/app/StorefrontLayout.tsx
git rm apps/web/src/features/admin/AdminTokenGate.tsx
git commit -m "feat(web): real auth (login/register/logout), AuthContext, admin role guard replaces token gate"
```

---

## Task 11: Web — Cart context, drawer, page, add-to-cart

**Files:**
- Modify: `apps/web/src/lib/api.ts` (cart client fns)
- Create: `apps/web/src/features/cart/CartContext.tsx`, `apps/web/src/features/cart/CartDrawer.tsx`, `apps/web/src/pages/Cart.tsx`
- Modify: `apps/web/src/pages/ProductDetail.tsx` (add-to-cart), `apps/web/src/app/StorefrontLayout.tsx` (cart icon + count), `apps/web/src/main.tsx` (`CartProvider`), `apps/web/src/app/router.tsx` (`/cart`)
- Test: `apps/web/src/features/cart/CartContext.test.tsx`

**Interfaces:**
- Consumes: `PricedCartDTO`, `CartItemInput`, `PriceCartInput` (shared); `apiGet`, `apiSend`; `useAuth`.
- Produces:
  - api client: `priceCart(items): Promise<PricedCartDTO>`, `getServerCart(): Promise<PricedCartDTO>`, `setServerCart(items): Promise<PricedCartDTO>`, `mergeServerCart(items): Promise<PricedCartDTO>`.
  - `CartProvider`, `useCart()` → `{ items: CartItemInput[], priced: PricedCartDTO | null, count: number, addItem, updateQty, removeItem, clear, open, setOpen }`.
  - Guest items persist to `localStorage['herencia.cart']`; on login the guest cart is merged server-side then localStorage cleared.

- [ ] **Step 1: Add cart client fns**

Append to `apps/web/src/lib/api.ts`:
```ts
export const priceCart = (items: CartItemInput[]) => apiSend<PricedCartDTO>('POST', '/api/cart/price', { items });
export const getServerCart = () => apiGet<PricedCartDTO>('/api/cart');
export const setServerCart = (items: CartItemInput[]) => apiSend<PricedCartDTO>('PUT', '/api/cart', { items });
export const mergeServerCart = (items: CartItemInput[]) => apiSend<PricedCartDTO>('POST', '/api/cart/merge', { items });
```
(Extend the top import with `PricedCartDTO, CartItemInput`.)

- [ ] **Step 2: Write the failing CartContext test**

`apps/web/src/features/cart/CartContext.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';
import { AuthProvider } from '../auth/AuthContext';
import * as api from '../../lib/api';

function Probe() {
  const { items, count, addItem } = useCart();
  return (
    <div>
      <span>count:{count}</span>
      <button onClick={() => addItem({ productId: 'a'.repeat(24), sizeLabel: '50ml', qty: 1 })}>add</button>
      <span>items:{items.length}</span>
    </div>
  );
}

describe('CartContext (guest)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, 'fetchMe').mockRejectedValue(new api.ApiError(401, 'no'));
    vi.spyOn(api, 'priceCart').mockResolvedValue({ items: [], subtotal: 0, shipping: 0, total: 0, hasUnavailable: false });
  });
  it('adds an item and persists to localStorage', async () => {
    render(<AuthProvider><CartProvider><Probe /></CartProvider></AuthProvider>);
    await waitFor(() => expect(screen.getByText('count:0')).toBeInTheDocument());
    await act(async () => { screen.getByText('add').click(); });
    await waitFor(() => expect(screen.getByText('count:1')).toBeInTheDocument());
    expect(JSON.parse(localStorage.getItem('herencia.cart') || '[]')).toHaveLength(1);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test --workspace apps/web -- CartContext`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement CartContext**

`apps/web/src/features/cart/CartContext.tsx`:
```tsx
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { CartItemInput, PricedCartDTO } from '@herencia/shared';
import * as api from '../../lib/api';
import { useAuth } from '../auth/AuthContext';

const LS_KEY = 'herencia.cart';
const loadGuest = (): CartItemInput[] => {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as CartItemInput[];
  } catch {
    return [];
  }
};

type CartValue = {
  items: CartItemInput[];
  priced: PricedCartDTO | null;
  count: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  addItem: (item: CartItemInput) => void;
  updateQty: (productId: string, sizeLabel: string, qty: number) => void;
  removeItem: (productId: string, sizeLabel: string) => void;
  clear: () => void;
};

const CartCtx = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<CartItemInput[]>(() => loadGuest());
  const [priced, setPriced] = useState<PricedCartDTO | null>(null);
  const [open, setOpen] = useState(false);
  const mergedRef = useRef(false);

  // Persist + re-price whenever items change (guest → localStorage + price endpoint;
  // logged-in → server PUT which returns the priced cart).
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      if (user) {
        const p = await api.setServerCart(items);
        if (!cancelled) setPriced(p);
      } else {
        localStorage.setItem(LS_KEY, JSON.stringify(items));
        const p = await api.priceCart(items);
        if (!cancelled) setPriced(p);
      }
    })().catch(() => undefined);
    return () => { cancelled = true; };
  }, [items, user, loading]);

  // On login, merge the guest cart server-side once, then adopt the server cart.
  useEffect(() => {
    if (loading || !user || mergedRef.current) return;
    mergedRef.current = true;
    (async () => {
      const guest = loadGuest();
      const merged = guest.length ? await api.mergeServerCart(guest) : await api.getServerCart();
      localStorage.removeItem(LS_KEY);
      setItems(merged.items.map((l) => ({ productId: l.productId, sizeLabel: l.sizeLabel, qty: l.qty })));
      setPriced(merged);
    })().catch(() => undefined);
  }, [user, loading]);

  const addItem: CartValue['addItem'] = (item) =>
    setItems((prev) => {
      const i = prev.findIndex((x) => x.productId === item.productId && x.sizeLabel === item.sizeLabel);
      if (i === -1) return [...prev, item];
      const next = [...prev];
      next[i] = { ...next[i]!, qty: Math.min(99, next[i]!.qty + item.qty) };
      return next;
    });
  const updateQty: CartValue['updateQty'] = (productId, sizeLabel, qty) =>
    setItems((prev) => prev.map((x) => (x.productId === productId && x.sizeLabel === sizeLabel ? { ...x, qty } : x)).filter((x) => x.qty > 0));
  const removeItem: CartValue['removeItem'] = (productId, sizeLabel) =>
    setItems((prev) => prev.filter((x) => !(x.productId === productId && x.sizeLabel === sizeLabel)));
  const clear = () => setItems([]);

  const count = items.reduce((n, i) => n + i.qty, 0);
  return (
    <CartCtx.Provider value={{ items, priced, count, open, setOpen, addItem, updateQty, removeItem, clear }}>
      {children}
    </CartCtx.Provider>
  );
}

export function useCart(): CartValue {
  const ctx = useContext(CartCtx);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
```

- [ ] **Step 5: Run the CartContext test**

Run: `npm run test --workspace apps/web -- CartContext`
Expected: PASS.

- [ ] **Step 6: Implement the drawer, page, add-to-cart, nav, providers**

- `apps/web/src/features/cart/CartDrawer.tsx`: a slide-over reading `useCart()` — list `priced.items` (name, size, qty stepper via `updateQty`, remove), show `subtotal`/`shipping`/`total` (reuse `Price`), a "Checkout" `Link` to `/checkout` that calls `setOpen(false)`, and an unavailable-line warning when `priced.hasUnavailable`. Use brand tokens; `role="dialog"`, `aria-label="Cart"`, ESC + backdrop close.
- `apps/web/src/pages/Cart.tsx`: full-page version of the same list (default export, lazy-routed).
- `apps/web/src/pages/ProductDetail.tsx`: add a size selector (radio/select over `product.sizes`) and an **Add to cart** button calling `addItem({ productId: product.id, sizeLabel, qty })` then `setOpen(true)`; disable for sizes with `stock === 0`.
- `apps/web/src/app/StorefrontLayout.tsx`: add a cart button showing `count`, opening the drawer (`setOpen(true)`); render `<CartDrawer />` in the layout.
- `apps/web/src/main.tsx`: wrap `<CartProvider>` **inside** `<AuthProvider>`.
- `apps/web/src/app/router.tsx`: add `{ path: '/cart', element: <Cart /> }` (lazy) under `StorefrontLayout`.

- [ ] **Step 7: Typecheck + build + web tests**

Run: `npm run test --workspace apps/web && npm run typecheck && npm run build`
Expected: PASS / 0 / build OK.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/features/cart apps/web/src/pages/Cart.tsx apps/web/src/pages/ProductDetail.tsx apps/web/src/app/StorefrontLayout.tsx apps/web/src/main.tsx apps/web/src/app/router.tsx
git commit -m "feat(web): cart context (guest localStorage + merge-on-login), drawer, page, add-to-cart"
```

---

## Task 12: Web — Checkout + order confirmation

**Files:**
- Modify: `apps/web/src/lib/api.ts` (`createOrder` client fn)
- Create: `apps/web/src/pages/Checkout.tsx`, `apps/web/src/pages/OrderConfirmation.tsx`
- Modify: `apps/web/src/app/router.tsx` (`/checkout`, `/order-confirmation`)
- Test: `apps/web/src/pages/Checkout.test.tsx`

**Interfaces:**
- Consumes: `createOrderSchema`, `CreateOrderInput`, `CreateOrderResultDTO` (shared); `useCart`, `useAuth`; account address fetch (optional prefill).
- Produces: api client `createOrder(input): Promise<CreateOrderResultDTO>`. Checkout submits, clears the cart, and navigates to `/order-confirmation` carrying `{ order, whatsappUrl }` via router state.

- [ ] **Step 1: Add the client fn**

Append to `apps/web/src/lib/api.ts` (extend import with `CreateOrderInput, CreateOrderResultDTO`):
```ts
export const createOrder = (input: CreateOrderInput) => apiSend<CreateOrderResultDTO>('POST', '/api/orders', input);
```

- [ ] **Step 2: Write the failing Checkout test**

`apps/web/src/pages/Checkout.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Checkout from './Checkout';
import { AuthProvider } from '../features/auth/AuthContext';
import { CartProvider } from '../features/cart/CartContext';
import * as api from '../lib/api';

function setup() {
  vi.spyOn(api, 'fetchMe').mockRejectedValue(new api.ApiError(401, 'no'));
  vi.spyOn(api, 'priceCart').mockResolvedValue({
    items: [{ productId: 'a'.repeat(24), slug: 'royal-oud', name: 'Royal Oud', image: 'x', sizeLabel: '50ml', unitPrice: 800, qty: 1, lineTotal: 800, available: true, maxQty: 5 }],
    subtotal: 800, shipping: 50, total: 850, hasUnavailable: false,
  });
  localStorage.setItem('herencia.cart', JSON.stringify([{ productId: 'a'.repeat(24), sizeLabel: '50ml', qty: 1 }]));
  return render(
    <MemoryRouter initialEntries={['/checkout']}>
      <AuthProvider><CartProvider>
        <Routes>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-confirmation" element={<div>Thank you</div>} />
        </Routes>
      </CartProvider></AuthProvider>
    </MemoryRouter>,
  );
}

describe('Checkout', () => {
  beforeEach(() => { localStorage.clear(); vi.restoreAllMocks(); });
  it('submits a COD order and navigates to confirmation', async () => {
    const create = vi.spyOn(api, 'createOrder').mockResolvedValue({
      order: { id: '1', orderNumber: 'HRC-1', items: [], customer: { name: 'Mai', phone: '0100000000' },
        shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '0100000000' },
        subtotal: 800, shipping: 50, total: 850, status: 'pending', paymentMethod: 'cod', createdAt: '2026-06-30T00:00:00Z' },
      whatsappUrl: 'https://wa.me/201000000000?text=hi',
    });
    setup();
    await waitFor(() => expect(screen.getByText(/Royal Oud/)).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Mai' } });
    fireEvent.change(screen.getByLabelText('Phone'), { target: { value: '0100000000' } });
    fireEvent.change(screen.getByLabelText('Address line 1'), { target: { value: '1 St' } });
    fireEvent.change(screen.getByLabelText('City'), { target: { value: 'Cairo' } });
    fireEvent.change(screen.getByLabelText('Governorate'), { target: { value: 'Cairo' } });
    fireEvent.click(screen.getByRole('button', { name: /place order/i }));
    await waitFor(() => expect(create).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Thank you')).toBeInTheDocument());
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test --workspace apps/web -- Checkout`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement Checkout + OrderConfirmation**

`apps/web/src/pages/Checkout.tsx` (default export): read `useCart()` for `priced`/`items`; render an order summary + a controlled form with labelled inputs (`Full name`, `Phone`, `Email` optional, `Address line 1`, `Address line 2` optional, `City`, `Governorate`, `Notes` optional). Prefill name/phone from `useAuth().user` when present. On submit, build `CreateOrderInput` from `items` + form, `createOrderSchema.parse(...)` client-side (catch → show first issue), call `api.createOrder`, then `clear()` and `navigate('/order-confirmation', { state: result, replace: true })`. Disable submit when `items.length === 0` or `priced?.hasUnavailable`. Show a friendly message when the cart is empty.

`apps/web/src/pages/OrderConfirmation.tsx` (default export): read `useLocation().state as CreateOrderResultDTO | null`; if null, show "No order to display" + link home. Otherwise show the order number, totals (reuse `Price`), and a prominent **Confirm on WhatsApp** anchor (`href={whatsappUrl}` `target="_blank"` `rel="noopener noreferrer"`).

- `apps/web/src/app/router.tsx`: add `{ path: '/checkout', element: <Checkout /> }` and `{ path: '/order-confirmation', element: <OrderConfirmation /> }` (lazy) under `StorefrontLayout`. (Checkout allows guests — no `RequireAuth`.)

- [ ] **Step 5: Run the Checkout test + typecheck + build**

Run: `npm run test --workspace apps/web -- Checkout && npm run typecheck && npm run build`
Expected: PASS / 0 / OK.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/pages/Checkout.tsx apps/web/src/pages/OrderConfirmation.tsx apps/web/src/app/router.tsx
git commit -m "feat(web): COD checkout form → order → WhatsApp confirmation page"
```

---

## Task 13: Web — Account area + wishlist UI

**Files:**
- Modify: `apps/web/src/lib/api.ts` (account + wishlist + orders client fns)
- Create: `apps/web/src/pages/Account.tsx`, `apps/web/src/components/WishlistButton.tsx`
- Modify: `apps/web/src/components/ProductCard.tsx` (wishlist heart), `apps/web/src/pages/ProductDetail.tsx` (wishlist button), `apps/web/src/app/router.tsx` (`/account` under `RequireAuth`)
- Test: `apps/web/src/components/WishlistButton.test.tsx`

**Interfaces:**
- Consumes: `AddressDTO`, `UpdateProfileInput`, `AddressInput`, `OrderDTO`, `ProductDTO` (shared); `useAuth`; React Query.
- Produces:
  - api client: `fetchProfile`, `updateProfile`, `fetchAddresses`, `addAddress`, `updateAddress`, `deleteAddress`, `fetchWishlist`, `addWishlist`, `removeWishlist`, `fetchMyOrders`.
  - `<WishlistButton productId={...} />` — a heart toggle that POST/DELETEs and reflects state; prompts login (navigate `/login`) for guests.
  - `/account` page with tabs/sections: Profile, Addresses, Orders, Wishlist.

- [ ] **Step 1: Add the client fns**

Append to `apps/web/src/lib/api.ts` (extend imports with `AddressDTO, UpdateProfileInput, AddressInput, OrderDTO`):
```ts
export const fetchProfile = () => apiGet<UserDTO>('/api/account/profile');
export const updateProfile = (input: UpdateProfileInput) => apiSend<UserDTO>('PUT', '/api/account/profile', input);
export const fetchAddresses = () => apiGet<AddressDTO[]>('/api/account/addresses');
export const addAddress = (input: AddressInput) => apiSend<AddressDTO>('POST', '/api/account/addresses', input);
export const updateAddress = (id: string, input: AddressInput) => apiSend<AddressDTO[]>('PUT', `/api/account/addresses/${id}`, input);
export const deleteAddress = (id: string) => apiSend<AddressDTO[]>('DELETE', `/api/account/addresses/${id}`);
export const fetchWishlist = () => apiGet<ProductDTO[]>('/api/account/wishlist');
export const addWishlist = (productId: string) => apiSend<{ ok: true }>('POST', '/api/account/wishlist', { productId });
export const removeWishlist = (productId: string) => apiSend<ProductDTO[]>('DELETE', `/api/account/wishlist/${productId}`);
export const fetchMyOrders = () => apiGet<{ items: OrderDTO[]; total: number; page: number; pages: number }>('/api/orders/me');
```

- [ ] **Step 2: Write the failing WishlistButton test**

`apps/web/src/components/WishlistButton.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WishlistButton } from './WishlistButton';
import { AuthProvider } from '../features/auth/AuthContext';
import * as api from '../lib/api';

describe('WishlistButton', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('redirects a guest to login on click (no API call)', async () => {
    vi.spyOn(api, 'fetchMe').mockRejectedValue(new api.ApiError(401, 'no'));
    const add = vi.spyOn(api, 'addWishlist').mockResolvedValue({ ok: true });
    render(<MemoryRouter><AuthProvider><WishlistButton productId={'a'.repeat(24)} /></AuthProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
    fireEvent.click(screen.getByRole('button'));
    expect(add).not.toHaveBeenCalled();
  });
  it('adds to wishlist for a logged-in user', async () => {
    vi.spyOn(api, 'fetchMe').mockResolvedValue({ id: '1', name: 'Mai', email: 'm@x.com', role: 'customer' });
    const add = vi.spyOn(api, 'addWishlist').mockResolvedValue({ ok: true });
    render(<MemoryRouter><AuthProvider><WishlistButton productId={'a'.repeat(24)} /></AuthProvider></MemoryRouter>);
    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(add).toHaveBeenCalled());
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test --workspace apps/web -- WishlistButton`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement WishlistButton + Account page**

`apps/web/src/components/WishlistButton.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import * as api from '../lib/api';

export function WishlistButton({ productId, initial = false }: { productId: string; initial?: boolean }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [on, setOn] = useState(initial);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!user) return navigate('/login', { state: { from: window.location.pathname } });
    setBusy(true);
    try {
      if (on) {
        await api.removeWishlist(productId);
        setOn(false);
      } else {
        await api.addWishlist(productId);
        setOn(true);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button type="button" onClick={toggle} disabled={loading || busy}
      aria-pressed={on} aria-label={on ? 'Remove from wishlist' : 'Add to wishlist'}
      className="rounded-full border border-line p-2 text-content hover:text-accent">
      {on ? '♥' : '♡'}
    </button>
  );
}
```

`apps/web/src/pages/Account.tsx` (default export, lazy-routed): use React Query to load profile, addresses, orders, and wishlist. Sections:
- **Profile** — editable name/phone form → `updateProfile`.
- **Addresses** — list with default badge; add/edit/delete via `addAddress`/`updateAddress`/`deleteAddress` (forms validated with `addressSchema`).
- **Orders** — `fetchMyOrders().items`: order number, date, status badge, total (reuse `Price`).
- **Wishlist** — grid of `ProductCard` from `fetchWishlist()`.
Include a "Sign out" button calling `useAuth().logout()` then `navigate('/')`.

- `apps/web/src/components/ProductCard.tsx`: render `<WishlistButton productId={product.id} />` in a corner.
- `apps/web/src/pages/ProductDetail.tsx`: render `<WishlistButton productId={product.id} />` near the add-to-cart button.
- `apps/web/src/app/router.tsx`: add `{ path: '/account', element: <RequireAuth><Account /></RequireAuth> }` (lazy) under `StorefrontLayout`.

- [ ] **Step 5: Run web tests + typecheck + build**

Run: `npm run test --workspace apps/web && npm run typecheck && npm run build`
Expected: PASS / 0 / OK.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/lib/api.ts apps/web/src/pages/Account.tsx apps/web/src/components/WishlistButton.tsx apps/web/src/components/WishlistButton.test.tsx apps/web/src/components/ProductCard.tsx apps/web/src/pages/ProductDetail.tsx apps/web/src/app/router.tsx
git commit -m "feat(web): account area (profile/addresses/orders/wishlist) + wishlist button"
```

---

## Task 14: Web — Admin order management UI

**Files:**
- Modify: `apps/web/src/features/admin/adminClient.ts` (admin order fns)
- Create: `apps/web/src/pages/admin/AdminOrders.tsx`
- Modify: `apps/web/src/pages/admin/AdminApp.tsx` (nav + route to orders)
- Test: `apps/web/src/pages/admin/AdminOrders.test.tsx`

**Interfaces:**
- Consumes: `OrderDTO`, `ORDER_STATUS`, `ORDER_STATUS_TRANSITIONS`, `UpdateOrderStatusInput` (shared); `apiGet`, `apiSend`.
- Produces:
  - admin client: `adminFetchOrders(status?): Promise<{ items: OrderDTO[]; total; page; pages }>`, `adminUpdateOrderStatus(id, status): Promise<OrderDTO>`.
  - `/admin/orders` page: status-filter tabs, order table, a status `<select>` limited to legal transitions.

- [ ] **Step 1: Add admin order client fns**

Append to `apps/web/src/features/admin/adminClient.ts`:
```ts
import type { OrderDTO, OrderStatus } from '@herencia/shared';

export const adminFetchOrders = (status?: OrderStatus) =>
  apiGet<{ items: OrderDTO[]; total: number; page: number; pages: number }>(
    `/api/admin/orders${status ? `?status=${status}` : ''}`,
  );
export const adminUpdateOrderStatus = (id: string, status: OrderStatus) =>
  apiSend<OrderDTO>('PUT', `/api/admin/orders/${id}/status`, { status });
```

- [ ] **Step 2: Write the failing AdminOrders test**

`apps/web/src/pages/admin/AdminOrders.test.tsx`:
```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AdminOrders from './AdminOrders';
import * as client from '../../features/admin/adminClient';

function wrap(ui: React.ReactNode) {
  return <QueryClientProvider client={new QueryClient()}><MemoryRouter>{ui}</MemoryRouter></QueryClientProvider>;
}

describe('AdminOrders', () => {
  beforeEach(() => vi.restoreAllMocks());
  it('renders orders from the admin API', async () => {
    vi.spyOn(client, 'adminFetchOrders').mockResolvedValue({
      items: [{ id: '1', orderNumber: 'HRC-1', items: [], customer: { name: 'Mai', phone: '0100000000' },
        shippingAddress: { line1: '1 St', city: 'Cairo', governorate: 'Cairo', phone: '0100000000' },
        subtotal: 800, shipping: 50, total: 850, status: 'pending', paymentMethod: 'cod', createdAt: '2026-06-30T00:00:00Z' }],
      total: 1, page: 1, pages: 1,
    });
    render(wrap(<AdminOrders />));
    await waitFor(() => expect(screen.getByText('HRC-1')).toBeInTheDocument());
    expect(screen.getByText(/Mai/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm run test --workspace apps/web -- AdminOrders`
Expected: FAIL — module missing.

- [ ] **Step 4: Implement AdminOrders + wire into AdminApp**

`apps/web/src/pages/admin/AdminOrders.tsx` (default export): React Query `useQuery(['admin-orders', status], () => adminFetchOrders(status))`; status-filter buttons from `ORDER_STATUS` (plus "all"); a table of orders (number, date, customer, total, current status). Per row, a `<select>` whose options are the current status plus `ORDER_STATUS_TRANSITIONS[current]`; on change call `adminUpdateOrderStatus(id, next)` and invalidate the query. Reuse `Price`/brand tokens.

- `apps/web/src/pages/admin/AdminApp.tsx`: add an **Orders** nav link and route to `<AdminOrders />` within the admin router (matching how `AdminProducts`/`AdminScentFamilies` are wired).

- [ ] **Step 5: Run web tests + typecheck + build**

Run: `npm run test --workspace apps/web -- AdminOrders && npm run typecheck && npm run build`
Expected: PASS / 0 / OK.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/features/admin/adminClient.ts apps/web/src/pages/admin/AdminOrders.tsx apps/web/src/pages/admin/AdminOrders.test.tsx apps/web/src/pages/admin/AdminApp.tsx
git commit -m "feat(web): admin order management UI (filter + guarded status changes)"
```

---

## Task 15: Verification + docs/state update

**Files:**
- Modify: `docs/TASKS.md`, `docs/memory/current-state.md`, `docs/memory/next-session.md`, `docs/memory/decisions.md`, `.superpowers/sdd/progress.md`

**Interfaces:** none (verification + bookkeeping).

- [ ] **Step 1: Full workspace verification**

Run each and confirm green:
```bash
npm run lint
npm run typecheck
npm run test
npm run build
```
Expected: lint 0, typecheck 0, all suites pass (shared + api + web — new commerce suites included), build succeeds. If `mongodb-memory-server` needs the Windows temp redirect, it is already configured in `apps/api/vitest.config.ts`.

- [ ] **Step 2: Manual smoke (optional, requires `.env` + seed)**

```bash
npm run seed --workspace apps/api
npm run dev
```
Walk: register → add to cart (guest) → login (cart merges) → checkout (COD) → WhatsApp link opens → order shows in `/account` → admin login → `/admin/orders` advances status. Confirm prices come from the server, not the client.

- [ ] **Step 3: Update the ledgers**

- `docs/TASKS.md`: tick every Milestone 2 box.
- `docs/memory/current-state.md`: set phase to "Milestone 2 complete" with the test counts and the new modules.
- `docs/memory/next-session.md`: point to Milestone 3 (Engagement) with the same plan→review→subagent workflow; note any carry-over minors.
- `docs/memory/decisions.md`: append M2 decisions — JWT cookie name `herencia_token` (Lax, 7d); `ADMIN_TOKEN` removed; cart pricing single-sourced in `priceItems`; order number format `HRC-<base36>-<rand>`; status transition map.
- `.superpowers/sdd/progress.md`: record Tasks 1–15 reviewed + any deferred minors.

- [ ] **Step 4: Commit**

```bash
git add docs/TASKS.md docs/memory .superpowers/sdd/progress.md
git commit -m "docs: Milestone 2 complete — state, decisions, next-session updated"
```

- [ ] **Step 5: Finish the branch**

Use **superpowers:finishing-a-development-branch** to run the final whole-branch review (opus), apply Critical/Important fixes, then merge `feat/milestone-2-commerce` into `master` (no remote yet — do not push unless the user adds one and asks).

---

## Self-Review

**1. Spec coverage** (against `docs/05_API.md`, `docs/07_BACKEND.md`, `docs/04_DATABASE.md`, M2 scope in `next-session.md`):
- Auth register/login/logout/me → Tasks 4–5. ✅
- JWT httpOnly cookie + bcrypt + role guard replacing `requireAdmin` internals → Task 4. ✅ (seam name kept; `adminToken`/`ADMIN_TOKEN` removed as the now-dead interim path.)
- Cart server-validated, never trust client prices, guest + merge-on-login → Tasks 6 (api) + 11 (web). ✅
- COD order + stock decrement + WhatsApp link + confirmation → Tasks 7 (api) + 12 (web). ✅
- Customer orders (`/orders/me`) → Task 7 + Account (Task 13). ✅
- Admin orders list + status lifecycle → Tasks 8 (api) + 14 (web). ✅
- Account profile + addresses CRUD + wishlist → Tasks 9 (api) + 13 (web). ✅
- Carry-overs `[F-min-5]` related type-filter + `[F-min-4]` ProductCard compareAt → Task 3. ✅
- Pagination envelope, Zod validation, error shape, money guard, mobile/dark/brand tokens → Global Constraints, applied per task. ✅
- Out of scope (reviews/quiz/banners/blog = M3; animations/a11y/perf/deploy = M4) → excluded. ✅

**2. Placeholder scan:** No "TBD"/"add validation"/"similar to Task N" left as code substitutes. Web presentational pages (Cart/Checkout/Account/AdminOrders/CartDrawer/Register) are specified by exact props, labels, endpoints, and behavior with their testable logic given as real code; the core logic units (contexts, guards, services, routes, libs) have complete code. Each task still has a runnable failing test before implementation.

**3. Type consistency:** `priceItems` returns `PricedCartDTO` (Task 2) consumed identically in Tasks 6/7/11/12. `OrderDTO`/`CreateOrderResultDTO` defined in Task 2, produced by `toOrderDTO`/`createOrder` (Task 7), consumed in Tasks 8/12/13/14. `UserDTO` (Task 1) flows through `toUserDTO` (Task 5) into auth/account/web. `AddressDTO` (Task 1) ↔ `toAddressDTO` (Task 9) ↔ Account UI (Task 13). `authCookie` test helper (Task 4) reused by every authed api test. Cookie name `herencia_token` is single-sourced as `AUTH_COOKIE` (Task 4) and asserted in tests. `ORDER_STATUS`/`ORDER_STATUS_TRANSITIONS` defined once (Task 2), used in model/routes/UI. No signature drift found.
