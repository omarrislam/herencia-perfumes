# Samples Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Per-perfume sample stock + all samples copy/price CMS-managed in Admin → Home; the global "Perfume Sample" product retired.

**Architecture:** A sample cart line is `{productId: <perfume id>, sizeLabel: 'sample'}` (reserved label). `priceItems` prices it from `settings.samples.price` and gates on `Product.sampleStock`. Order snapshots store a display label + `isSample: true`. All copy lives in `Setting.samples` with shared defaults.

**Tech Stack:** Existing monorepo — Zod (shared), Express + Mongoose (api), React + react-query (web), Vitest.

**Spec:** `docs/superpowers/specs/2026-07-14-samples-redesign-design.md` (approved).

## Global Constraints

- TypeScript strict; never trust client prices (server recomputes everything).
- Reserved cart label is exactly `'sample'` (shared constant `SAMPLE_SIZE_LABEL`).
- Global sample price/size — NO per-perfume price.
- All new user-facing strings have the current live copy as defaults (listed in Task 1).
- Suites must stay green: shared / api / web. Run from each workspace dir with `npx vitest run`.
- Do NOT commit `.env`, `dist`, `node_modules`. Commit after each task (co-author line per CLAUDE.md).
- Windows dev machine: run api tests from `apps/api` (mongod temp redirect lives in its vitest config).

---

### Task 1: Shared — constants, samples settings schema, sampleStock, samples query flag

**Files:**
- Modify: `packages/shared/src/enums.ts` (add `SAMPLE_SIZE_LABEL`; keep `SAMPLE_PRODUCT` until Task 8)
- Modify: `packages/shared/src/schemas/settings.ts`
- Modify: `packages/shared/src/schemas/catalog.ts`
- Modify: `packages/shared/src/schemas/order.ts` (OrderItemDTO gains `isSample?`)
- Test: `packages/shared/src/schemas/settings.test.ts` (create), `packages/shared/src/schemas/catalog.test.ts`

**Interfaces (Produces):**
- `SAMPLE_SIZE_LABEL = 'sample'` (const, from `enums.ts`)
- `samplesSettingsSchema`, `SamplesSettings`, `DEFAULT_SAMPLES_SETTINGS` (from `schemas/settings.ts`)
- `SettingDTO.samples: SamplesSettings`; `updateSettingsSchema.samples` (partial, optional)
- `adminProductSchema.sampleStock: number` (default 0); size label `'sample'` (case-insensitive) rejected
- `productQuerySchema.samples` (explicit `'true'/'false'` parse like `featured`)
- `ProductDTO.sampleStock: number`
- `OrderItemDTO.isSample?: boolean`

- [ ] **Step 1: Write failing tests**

Append to `packages/shared/src/schemas/catalog.test.ts` (inside `describe('adminProductSchema')`):

```ts
  it('defaults sampleStock to 0 and accepts a value', () => {
    expect(adminProductSchema.parse(base).sampleStock).toBe(0);
    expect(adminProductSchema.parse({ ...base, sampleStock: 12 }).sampleStock).toBe(12);
    expect(() => adminProductSchema.parse({ ...base, sampleStock: -1 })).toThrow();
  });
  it('rejects a size row labeled with the reserved sample label', () => {
    expect(() =>
      adminProductSchema.parse({ ...base, sizes: [{ label: 'Sample', price: 60, stock: 1 }] }),
    ).toThrow();
  });
```

And inside `describe('productQuerySchema')`:

```ts
  it('parses samples=true explicitly', () => {
    expect(productQuerySchema.parse({ samples: 'true' }).samples).toBe(true);
    expect(productQuerySchema.parse({ samples: 'false' }).samples).toBe(false);
    expect(productQuerySchema.parse({}).samples).toBe(false);
  });
```

Create `packages/shared/src/schemas/settings.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { samplesSettingsSchema, DEFAULT_SAMPLES_SETTINGS, updateSettingsSchema } from './settings';

describe('samplesSettingsSchema', () => {
  it('has complete defaults matching the live copy', () => {
    expect(DEFAULT_SAMPLES_SETTINGS.price).toBe(60);
    expect(DEFAULT_SAMPLES_SETTINGS.sizeLabel).toBe('5ml');
    expect(DEFAULT_SAMPLES_SETTINGS.steps).toHaveLength(3);
    expect(DEFAULT_SAMPLES_SETTINGS.ctaText).toContain('{price}');
    expect(samplesSettingsSchema.parse(DEFAULT_SAMPLES_SETTINGS)).toEqual(DEFAULT_SAMPLES_SETTINGS);
  });
  it('updateSettingsSchema accepts a partial samples object', () => {
    const r = updateSettingsSchema.parse({ samples: { price: 80 } });
    expect(r.samples).toEqual({ price: 80 });
  });
  it('rejects a non-positive price and wrong steps arity', () => {
    expect(() => samplesSettingsSchema.parse({ ...DEFAULT_SAMPLES_SETTINGS, price: 0 })).toThrow();
    expect(() => samplesSettingsSchema.parse({ ...DEFAULT_SAMPLES_SETTINGS, steps: ['a'] })).toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failures**

Run (from `packages/shared`): `npx vitest run src/schemas/settings.test.ts src/schemas/catalog.test.ts`
Expected: FAIL — `samplesSettingsSchema` not exported; sampleStock undefined; samples flag undefined.

- [ ] **Step 3: Implement**

`packages/shared/src/enums.ts` — add below `SAMPLE_PRODUCT`:

```ts
// Reserved cart-line size label for per-perfume samples. A cart line
// { productId: <perfume>, sizeLabel: SAMPLE_SIZE_LABEL } is priced from
// settings.samples and stocked from Product.sampleStock.
export const SAMPLE_SIZE_LABEL = 'sample' as const;
```

`packages/shared/src/schemas/settings.ts` — add after `promoBarSchema`:

```ts
// Samples program — global price/size + every user-facing string of the home
// samples section and the sample modal. {price}/{size} tokens are interpolated.
export const samplesSettingsSchema = z.object({
  price: z.number().positive(),
  sizeLabel: z.string().min(1).max(20),
  eyebrow: z.string().min(1).max(80),
  heading: z.string().min(1).max(120),
  strapline: z.string().min(1).max(200),
  steps: z.tuple([z.string().min(1).max(120), z.string().min(1).max(120), z.string().min(1).max(120)]),
  ctaText: z.string().min(1).max(80),
  stickerTop: z.string().min(1).max(40),
  stickerBottom: z.string().min(1).max(40),
  modalTitle: z.string().min(1).max(80),
  modalText: z.string().min(1).max(300),
});
export type SamplesSettings = z.infer<typeof samplesSettingsSchema>;

export const DEFAULT_SAMPLES_SETTINGS: SamplesSettings = {
  price: 60,
  sizeLabel: '5ml',
  eyebrow: 'Try before you commit',
  heading: 'Samples first.\nBottles later.',
  strapline: 'Any scent · {size} vial · {price} each — credited back when you buy the bottle.',
  steps: [
    'Pick any scents from the collection',
    'Wear each one for a full day',
    'Sample price credited to your bottle',
  ],
  ctaText: 'Order samples · {price} each',
  stickerTop: '{size} from',
  stickerBottom: 'per sample',
  modalTitle: 'Order samples',
  modalText: 'Pick as many as you like · {size} each · {price} per sample. The value is credited when you buy the bottle.',
};
```

In `updateSettingsSchema` add `samples: samplesSettingsSchema.partial().optional(),` (after `emailPopup`). In `SettingDTO` add `samples: SamplesSettings;`.

`packages/shared/src/schemas/catalog.ts`:
- In `adminProductSchema` after `sizes`: nothing — instead extend `sizes` validation and add field after `isActive`:

```ts
    sizes: z
      .array(productSizeSchema)
      .min(1)
      .refine((arr) => arr.every((s) => s.label.trim().toLowerCase() !== 'sample'), {
        message: "'sample' is a reserved size label",
      }),
```

and add `sampleStock: z.number().int().min(0).default(0),` (next to `isFeatured`).
- In `productQuerySchema` after `featured`:

```ts
  // Perfumes that currently offer samples (sampleStock > 0). Same explicit
  // parse as `featured` — z.coerce.boolean would turn "false" into true.
  samples: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
```

- In `ProductDTO` add `sampleStock: number;` (after `sizes`).

`packages/shared/src/schemas/order.ts` — in `OrderItemDTO` add `isSample?: boolean;`.

- [ ] **Step 4: Run shared suite**

Run (from `packages/shared`): `npx vitest run`
Expected: all green (48 + new).

- [ ] **Step 5: Build shared + commit**

Run (repo root): `npm run build --workspace packages/shared`
```bash
git add packages/shared
git commit -m "feat(shared): samples settings schema, sampleStock, reserved sample label"
```

---

### Task 2: API — Setting.samples + serialize defaults + Product.sampleStock end-to-end

**Files:**
- Modify: `apps/api/src/models/Setting.ts`, `apps/api/src/models/Product.ts`
- Modify: `apps/api/src/lib/serialize.ts` (`toSettingDTO`, `toProductDTO`, `toOrderDTO`)
- Modify: `apps/api/src/routes/catalog.ts` (samples filter)
- Test: `apps/api/src/routes/settings.test.ts`, `apps/api/src/routes/adminSettings.test.ts`, `apps/api/src/routes/catalog.test.ts`

**Interfaces:**
- Consumes: Task 1 exports (`samplesSettingsSchema`, `DEFAULT_SAMPLES_SETTINGS`).
- Produces: `GET /api/settings → { samples: SamplesSettings }` (always complete, defaults filled); `PUT /api/admin/settings { samples: {...partial} }` merges; `GET /api/products?samples=true` → active perfumes with `sampleStock > 0`; `ProductDTO.sampleStock` everywhere.

- [ ] **Step 1: Write failing tests**

Append to `apps/api/src/routes/settings.test.ts` (mirror existing test style — createApp, seeded Setting):

```ts
  it('exposes samples settings with defaults when the doc has none', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(200);
    expect(res.body.samples.price).toBe(60);
    expect(res.body.samples.sizeLabel).toBe('5ml');
    expect(res.body.samples.steps).toHaveLength(3);
  });
```

Append to `apps/api/src/routes/adminSettings.test.ts`:

```ts
  it('partially updates samples settings without clobbering siblings', async () => {
    const res = await request(app).put('/api/admin/settings').set('Cookie', ADMIN)
      .send({ samples: { price: 80, sizeLabel: '3ml' } });
    expect(res.status).toBe(200);
    expect(res.body.samples.price).toBe(80);
    expect(res.body.samples.sizeLabel).toBe('3ml');
    expect(res.body.samples.modalTitle).toBe('Order samples'); // default preserved
  });
```

Append to `apps/api/src/routes/catalog.test.ts` (mirror existing product fixtures):

```ts
  it('filters ?samples=true to active perfumes with sampleStock > 0', async () => {
    const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
    const mk = (slug: string, sampleStock: number) => ({
      name: slug, slug, type: 'perfume', shortDesc: 's', description: 'd',
      images: ['x'], sizes: [{ label: '50ml', price: 100, stock: 5 }], basePrice: 100,
      scentFamily: fam._id, gender: 'unisex', concentration: 'EDP', isActive: true, sampleStock,
    });
    await Product.create(mk('with-samples', 10));
    await Product.create(mk('without-samples', 0));
    const res = await request(app).get('/api/products?samples=true');
    expect(res.status).toBe(200);
    expect(res.body.items.map((p: { slug: string }) => p.slug)).toEqual(['with-samples']);
    expect(res.body.items[0].sampleStock).toBe(10);
  });
```

- [ ] **Step 2: Run to verify failures**

Run (from `apps/api`): `npx vitest run src/routes/settings.test.ts src/routes/adminSettings.test.ts src/routes/catalog.test.ts`
Expected: FAIL — `samples` undefined in DTO; filter returns both products.

- [ ] **Step 3: Implement**

`apps/api/src/models/Setting.ts` — add after `promoBar`:

```ts
    samples: {
      price: { type: Number },
      sizeLabel: { type: String },
      eyebrow: { type: String },
      heading: { type: String },
      strapline: { type: String },
      steps: { type: [String] },
      ctaText: { type: String },
      stickerTop: { type: String },
      stickerBottom: { type: String },
      modalTitle: { type: String },
      modalText: { type: String },
    },
```

`apps/api/src/models/Product.ts` — add after `basePrice`:

```ts
    sampleStock: { type: Number, default: 0, min: 0 },
```

`apps/api/src/lib/serialize.ts`:
- Import `DEFAULT_SAMPLES_SETTINGS` from `@herencia/shared`.
- In `toSettingDTO` add (before `contactEmail`):

```ts
    samples: {
      price: doc.samples?.price ?? DEFAULT_SAMPLES_SETTINGS.price,
      sizeLabel: doc.samples?.sizeLabel ?? DEFAULT_SAMPLES_SETTINGS.sizeLabel,
      eyebrow: doc.samples?.eyebrow ?? DEFAULT_SAMPLES_SETTINGS.eyebrow,
      heading: doc.samples?.heading ?? DEFAULT_SAMPLES_SETTINGS.heading,
      strapline: doc.samples?.strapline ?? DEFAULT_SAMPLES_SETTINGS.strapline,
      steps:
        Array.isArray(doc.samples?.steps) && doc.samples.steps.length === 3
          ? (doc.samples.steps as [string, string, string])
          : DEFAULT_SAMPLES_SETTINGS.steps,
      ctaText: doc.samples?.ctaText ?? DEFAULT_SAMPLES_SETTINGS.ctaText,
      stickerTop: doc.samples?.stickerTop ?? DEFAULT_SAMPLES_SETTINGS.stickerTop,
      stickerBottom: doc.samples?.stickerBottom ?? DEFAULT_SAMPLES_SETTINGS.stickerBottom,
      modalTitle: doc.samples?.modalTitle ?? DEFAULT_SAMPLES_SETTINGS.modalTitle,
      modalText: doc.samples?.modalText ?? DEFAULT_SAMPLES_SETTINGS.modalText,
    },
```

- In `toProductDTO` add `sampleStock: doc.sampleStock ?? 0,` (after `basePrice`).
- In `toOrderDTO` items map add `isSample: i.isSample ? true : undefined,`.

`apps/api/src/routes/catalog.ts` — after `if (q.featured) filter.isFeatured = true;`:

```ts
    if (q.samples) {
      filter.type = 'perfume';
      filter.sampleStock = { $gt: 0 };
    }
```

Check the admin settings PUT route (`apps/api/src/routes/adminSettings.ts` or the settings handler in `admin.ts`) merges nested objects the same way `instapay`/`emailPopup` do — follow the existing partial-merge pattern for `samples` (deep-merge onto `doc.samples`).

- [ ] **Step 4: Run to verify green**

Run (from `apps/api`): `npx vitest run src/routes/settings.test.ts src/routes/adminSettings.test.ts src/routes/catalog.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api packages/shared
git commit -m "feat(api): samples settings + Product.sampleStock + ?samples=true filter"
```

---

### Task 3: API — priceItems prices reserved sample lines

**Files:**
- Modify: `apps/api/src/modules/cart/service.ts`
- Test: `apps/api/src/modules/cart/service.test.ts`

**Interfaces:**
- Consumes: `SAMPLE_SIZE_LABEL`, `DEFAULT_SAMPLES_SETTINGS` (Task 1); `Product.sampleStock` (Task 2).
- Produces: a priced line for `{productId, sizeLabel: 'sample', qty}` with `unitPrice = settings.samples.price`, `maxQty = sampleStock`, `available` iff active perfume with `sampleStock >= qty`. DTO `sizeLabel` stays `'sample'` (web renders the display label).

- [ ] **Step 1: Write failing tests**

Append to `apps/api/src/modules/cart/service.test.ts` (reuse its product/setting fixtures):

```ts
  it('prices a sample line from settings and gates on sampleStock', async () => {
    const p = await Product.create({
      name: 'Amber Noir', slug: 'amber-noir', type: 'perfume', shortDesc: 's', description: 'd',
      images: ['img'], sizes: [{ label: '50ml', price: 1100, stock: 3 }], basePrice: 1100,
      gender: 'unisex', concentration: 'EDP', isActive: true, sampleStock: 2,
    });
    await Setting.create({ whatsappNumber: '20100', hero: { title: 't', subtitle: 's', ctaText: 'c', ctaLink: '/', image: 'i' }, samples: { price: 75 } });
    const priced = await priceItems([{ productId: String(p._id), sizeLabel: 'sample', qty: 2 }]);
    expect(priced.items[0]!.unitPrice).toBe(75);
    expect(priced.items[0]!.available).toBe(true);
    expect(priced.items[0]!.maxQty).toBe(2);
    expect(priced.subtotal).toBe(150);

    const over = await priceItems([{ productId: String(p._id), sizeLabel: 'sample', qty: 3 }]);
    expect(over.items[0]!.available).toBe(false);
    expect(over.hasUnavailable).toBe(true);
  });

  it('sample lines are unavailable for non-perfumes and zero-sample products', async () => {
    const bundle = await Product.create({
      name: 'Duo', slug: 'duo', type: 'bundle', shortDesc: 's', description: 'd', images: ['img'],
      sizes: [{ label: 'Set', price: 1900, stock: 3 }], basePrice: 1900,
      gender: 'unisex', concentration: 'Other', isActive: true, sampleStock: 5,
      bundleItems: [],
    });
    const priced = await priceItems([{ productId: String(bundle._id), sizeLabel: 'sample', qty: 1 }]);
    expect(priced.items[0]!.available).toBe(false);
  });
```

(Import `Setting` in the test file if not already imported; check existing fixtures for the exact Setting seed shape used elsewhere in the file and reuse it.)

- [ ] **Step 2: Run to verify failures**

Run (from `apps/api`): `npx vitest run src/modules/cart/service.test.ts`
Expected: FAIL — sample line priced 0/unavailable path wrong (no matching size).

- [ ] **Step 3: Implement**

Rewrite the mapping section of `priceItems` in `apps/api/src/modules/cart/service.ts`:

```ts
import { SAMPLE_SIZE_LABEL, DEFAULT_SAMPLES_SETTINGS } from '@herencia/shared';

export async function priceItems(items: CartItemInput[]): Promise<PricedCartDTO> {
  const ids = [...new Set(items.map((i) => i.productId))];
  const [products, setting] = await Promise.all([
    Product.find({ _id: { $in: ids } }).lean(),
    Setting.findOne().lean(),
  ]);
  const byId = new Map(products.map((p) => [String(p._id), p]));
  const samplePrice = setting?.samples?.price ?? DEFAULT_SAMPLES_SETTINGS.price;

  const lines: PricedCartLineDTO[] = items.map((item) => {
    const p = byId.get(item.productId);
    const active = !!p?.isActive;

    if (item.sizeLabel === SAMPLE_SIZE_LABEL) {
      // Per-perfume sample: price is global (settings), stock is the perfume's
      // sampleStock. Only active perfumes can offer samples.
      const maxQty = p?.type === 'perfume' && active ? (p?.sampleStock ?? 0) : 0;
      const available = item.qty <= maxQty && maxQty > 0;
      return {
        productId: item.productId,
        slug: p?.slug ?? '',
        name: p?.name ?? 'Unavailable item',
        image: p?.images?.[0] ?? '',
        sizeLabel: SAMPLE_SIZE_LABEL,
        unitPrice: samplePrice,
        qty: item.qty,
        lineTotal: available ? round2(samplePrice * item.qty) : 0,
        available,
        maxQty,
      };
    }

    const size = p?.sizes?.find((s) => s.label === item.sizeLabel);
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

(Note the Setting fetch moves UP and into the `Promise.all` — the tail of the function loses its own `Setting.findOne()`.)

- [ ] **Step 4: Run to verify green**

Run (from `apps/api`): `npx vitest run src/modules/cart/service.test.ts`
Expected: PASS (old tests + new).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/cart
git commit -m "feat(api): price reserved sample lines from settings + sampleStock"
```

---

### Task 4: API — createOrder decrements sampleStock; cancel restores it; snapshot label

**Files:**
- Modify: `apps/api/src/modules/order/service.ts`
- Modify: `apps/api/src/models/Order.ts` (item `isSample: Boolean`)
- Modify: `apps/api/src/routes/admin.ts` (cancel-restore branch, ~line 222)
- Test: `apps/api/src/modules/order/service.test.ts`, `apps/api/src/routes/adminOrders.test.ts`

**Interfaces:**
- Consumes: `SAMPLE_SIZE_LABEL`, `DEFAULT_SAMPLES_SETTINGS`; priced sample lines (Task 3).
- Produces: order items for sample lines have `sizeLabel: 'Sample · <settings sizeLabel>'`, `isSample: true`; `Product.sampleStock` decremented atomically with rollback; cancel restores `sampleStock`.

- [ ] **Step 1: Write failing tests**

Append to `apps/api/src/modules/order/service.test.ts` (reuse its fixtures/`baseInput` pattern — read the file's existing helpers first and match them):

```ts
  it('creates an order with a sample line: decrements sampleStock, snapshots label', async () => {
    const p = await Product.create({ /* perfume fixture as in existing tests */ sampleStock: 3 });
    const result = await createOrder({
      ...baseInput,
      items: [{ productId: String(p._id), sizeLabel: 'sample', qty: 2 }],
    });
    expect(result.order.items[0]!.sizeLabel).toBe('Sample · 5ml');
    expect(result.order.items[0]!.isSample).toBe(true);
    const fresh = await Product.findById(p._id).lean();
    expect(fresh!.sampleStock).toBe(1);
  });

  it('rejects a sample order beyond sampleStock and rolls back nothing', async () => {
    const p = await Product.create({ /* perfume fixture */ sampleStock: 1 });
    await expect(
      createOrder({ ...baseInput, items: [{ productId: String(p._id), sizeLabel: 'sample', qty: 2 }] }),
    ).rejects.toMatchObject({ status: 409 });
    const fresh = await Product.findById(p._id).lean();
    expect(fresh!.sampleStock).toBe(1);
  });
```

Append to `apps/api/src/routes/adminOrders.test.ts` (mirror its cancel-restores-stock test):

```ts
  it('cancelling restores sampleStock for sample items', async () => {
    // create perfume with sampleStock 5, order 2 samples (via createOrder or direct Order.create
    // with items [{ product, name, sizeLabel: 'Sample · 5ml', unitPrice: 60, qty: 2, isSample: true }]),
    // then PUT status cancelled and expect sampleStock back to 5.
    // Follow the exact arrange/act/assert shape of the existing
    // "cancel restores stock" test in this file, adding isSample: true to the item.
  });
```

(Write it fully by copying the existing cancel test's structure — same auth cookie, same status transition path.)

- [ ] **Step 2: Run to verify failures**

Run (from `apps/api`): `npx vitest run src/modules/order/service.test.ts src/routes/adminOrders.test.ts`
Expected: FAIL — sample line 409s as `cart_unavailable`? No: with Task 3 priced, it's available; failure will be sizes `$elemMatch` decrement miss → `stock_conflict`, and label snapshot mismatch.

- [ ] **Step 3: Implement**

`apps/api/src/models/Order.ts` — in the item subschema add `isSample: { type: Boolean },`.

`apps/api/src/modules/order/service.ts`:
- Import `SAMPLE_SIZE_LABEL, DEFAULT_SAMPLES_SETTINGS` from `@herencia/shared`.
- Move the `const setting = await Setting.findOne().lean();` that currently sits inside the `try` block to ABOVE the decrement loop (it's needed for the sample display label), keeping a single fetch.
- Replace the decrement loop with:

```ts
  const setting = await Setting.findOne().lean();
  const sampleSizeLabel = setting?.samples?.sizeLabel ?? DEFAULT_SAMPLES_SETTINGS.sizeLabel;

  // Atomically decrement stock; roll back on any failure to avoid oversell.
  const decremented: { id: string; label: string; qty: number; isSample: boolean }[] = [];
  for (const line of priced.items) {
    const isSample = line.sizeLabel === SAMPLE_SIZE_LABEL;
    const r = isSample
      ? await Product.updateOne(
          { _id: line.productId, sampleStock: { $gte: line.qty } },
          { $inc: { sampleStock: -line.qty } },
        )
      : await Product.updateOne(
          {
            _id: line.productId,
            sizes: { $elemMatch: { label: line.sizeLabel, stock: { $gte: line.qty } } },
          },
          { $inc: { 'sizes.$.stock': -line.qty } },
        );
    if (r.modifiedCount !== 1) {
      await rollback(decremented);
      throw new HttpError(
        409,
        'Stock changed during checkout, please review your cart',
        'stock_conflict',
      );
    }
    decremented.push({ id: line.productId, label: line.sizeLabel, qty: line.qty, isSample });
  }
```

- Add a module-level helper and use it in BOTH rollback sites (the loop above and the outer `catch`):

```ts
async function rollback(decremented: { id: string; label: string; qty: number; isSample: boolean }[]): Promise<void> {
  for (const d of decremented) {
    if (d.isSample) {
      await Product.updateOne({ _id: d.id }, { $inc: { sampleStock: d.qty } });
    } else {
      await Product.updateOne(
        { _id: d.id, 'sizes.label': d.label },
        { $inc: { 'sizes.$.stock': d.qty } },
      );
    }
  }
}
```

- In the `Order.create` items map, snapshot the display label + flag:

```ts
      items: priced.items.map((l) => ({
        product: l.productId,
        name: l.name,
        sizeLabel: l.sizeLabel === SAMPLE_SIZE_LABEL ? `Sample · ${sampleSizeLabel}` : l.sizeLabel,
        unitPrice: l.unitPrice,
        qty: l.qty,
        image: l.image,
        isSample: l.sizeLabel === SAMPLE_SIZE_LABEL || undefined,
      })),
```

- The `try` block's duplicate `const setting = await Setting.findOne().lean();` is removed (use the one fetched above).

`apps/api/src/routes/admin.ts` cancel-restore branch becomes:

```ts
      if (from !== to && to === 'cancelled') {
        for (const item of order.items) {
          if (item.isSample) {
            await Product.updateOne({ _id: item.product }, { $inc: { sampleStock: item.qty } });
          } else {
            await Product.updateOne(
              { _id: item.product, 'sizes.label': item.sizeLabel },
              { $inc: { 'sizes.$.stock': item.qty } },
            );
          }
        }
      }
```

- [ ] **Step 4: Run to verify green**

Run (from `apps/api`): `npx vitest run src/modules/order/service.test.ts src/routes/adminOrders.test.ts src/modules/cart/service.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api
git commit -m "feat(api): sample lines through order create/rollback/cancel with sampleStock"
```

---

### Task 5: Web — settings-driven ThreeSteps + token helper

**Files:**
- Create: `apps/web/src/lib/sampleCopy.ts`
- Modify: `apps/web/src/components/ThreeSteps.tsx` (rewrite data source; keep layout)
- Test: `apps/web/src/lib/sampleCopy.test.ts`

**Interfaces:**
- Consumes: `SettingDTO.samples` from `fetchSettings` (query key `['settings']`, already used app-wide).
- Produces: `applySampleTokens(text: string, s: { price: number; sizeLabel: string }): string` — replaces `{price}` with `formatEGP(price)` output and `{size}` with `sizeLabel`.

- [ ] **Step 1: Write failing test**

`apps/web/src/lib/sampleCopy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { applySampleTokens } from './sampleCopy';

describe('applySampleTokens', () => {
  it('replaces {price} and {size} tokens (all occurrences)', () => {
    const out = applySampleTokens('Any scent · {size} vial · {price} each · {price}', { price: 60, sizeLabel: '5ml' });
    expect(out).toContain('5ml');
    expect(out).not.toContain('{price}');
    expect(out).not.toContain('{size}');
    expect(out.match(/60/g)!.length).toBe(2);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run (from `apps/web`): `npx vitest run src/lib/sampleCopy.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`apps/web/src/lib/sampleCopy.ts`:

```ts
import type { SamplesSettings } from '@herencia/shared';
import { formatEGP } from '../components/Price';

// Interpolates the {price}/{size} tokens used in admin-editable samples copy.
export function applySampleTokens(
  text: string,
  s: Pick<SamplesSettings, 'price' | 'sizeLabel'>,
): string {
  return text.replaceAll('{price}', formatEGP(s.price)).replaceAll('{size}', s.sizeLabel);
}
```

`apps/web/src/components/ThreeSteps.tsx` — rewrite the data source (keep ALL existing JSX/classes):

```tsx
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_SAMPLES_SETTINGS } from '@herencia/shared';
import { useSamples } from '../features/samples/SampleContext';
import { fetchSettings } from '../lib/api';
import { applySampleTokens } from '../lib/sampleCopy';
import { formatEGP } from './Price';

export function ThreeSteps() {
  const { open } = useSamples();
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings, staleTime: 60_000 });
  const s = settings.data?.samples ?? DEFAULT_SAMPLES_SETTINGS;
  const t = (text: string) => applySampleTokens(text, s);
  // …existing JSX, with:
  //  eyebrow            → {s.eyebrow}
  //  h2                 → {s.heading} rendered with className +" whitespace-pre-line" (drop the <br/>)
  //  strapline <p>      → {t(s.strapline)}
  //  STEPS list         → s.steps.map((text, i) => … n = String(i + 1))
  //  CTA button label   → {t(s.ctaText)}
  //  sticker top line   → {t(s.stickerTop)}
  //  sticker big line   → {formatEGP(s.price)}
  //  sticker bottom     → {t(s.stickerBottom)}
  // The `sample`/`fetchProduct` query and SAMPLE_PRODUCT import are DELETED.
}
```

Write the full JSX by editing the current file in place — only the data bindings change, plus `whitespace-pre-line` on the `<h2>`.

- [ ] **Step 4: Run web tests**

Run (from `apps/web`): `npx vitest run src/lib/sampleCopy.test.ts`
Expected: PASS. Then `npx vitest run` — if any Home-related test stubs `/api/products/sample-box`, update it to stub `/api/settings` instead (the fetch no longer happens).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/sampleCopy.ts apps/web/src/lib/sampleCopy.test.ts apps/web/src/components/ThreeSteps.tsx
git commit -m "feat(web): ThreeSteps copy/price fully settings-driven"
```

---

### Task 6: Web — SampleModal per-perfume lines + PDP gating + cart rendering

**Files:**
- Modify: `apps/web/src/features/samples/SampleModal.tsx`
- Modify: `apps/web/src/components/TryScentButton.tsx` (no change to look; PDP gates)
- Modify: `apps/web/src/pages/ProductDetail.tsx` (gate on `sampleStock > 0`)
- Modify: `apps/web/src/features/cart/CartDrawer.tsx`, `apps/web/src/pages/Cart.tsx` (render sample lines; delete picked-names block)
- Modify: `apps/web/src/pages/Checkout.tsx` (delete the sample-notes hack; render sample lines in summary if it prints sizeLabels)
- Modify: `apps/web/src/lib/api.ts` (`ProductFilters` gains `samples?: boolean`)

**Interfaces:**
- Consumes: `GET /api/products?samples=true` (Task 2), `SAMPLE_SIZE_LABEL`, `applySampleTokens` (Task 5).
- Produces: cart lines `{ productId: <perfume id>, sizeLabel: SAMPLE_SIZE_LABEL, qty: 1 }` per picked perfume; sample lines render as `Sample · {settings sizeLabel}` everywhere.

- [ ] **Step 1: Update SampleModal**

Key changes to `SampleModal.tsx` (keep all layout/animation):

```tsx
import { SAMPLE_SIZE_LABEL, DEFAULT_SAMPLES_SETTINGS } from '@herencia/shared';
import { fetchProducts, fetchSettings } from '../../lib/api';
import { applySampleTokens } from '../../lib/sampleCopy';
// …
  const products = useQuery({ queryKey: ['products', 'sample-pick'], queryFn: () => fetchProducts({ samples: true, limit: 48 }), enabled: isOpen });
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings, enabled: isOpen, staleTime: 60_000 });
  const s = settings.data?.samples ?? DEFAULT_SAMPLES_SETTINGS;

  const pool = products.data?.items ?? []; // server already filtered to sampled perfumes
  const unitPrice = s.price;
  const canAdd = samples.length > 0;

  const addSamplesToCart = () => {
    if (samples.length === 0) return;
    // One line per picked perfume (qty 1 each).
    for (const picked of samples) {
      const line = items.find((i) => i.productId === picked.id && i.sizeLabel === SAMPLE_SIZE_LABEL);
      if (!line) addItem({ productId: picked.id, sizeLabel: SAMPLE_SIZE_LABEL, qty: 1 });
    }
    clear();
    close();
    setOpen(true);
  };
```

Header copy: eyebrow `{s.eyebrow}`, title `{s.modalTitle}`, text `{applySampleTokens(s.modalText, s)}`. Footer unchanged except `unitPrice` source. The `sampleProduct` query, `fetchProduct` import, `sizeLabel` var, and `updateQty` usage are DELETED (import `SAMPLE_SIZE_LABEL` instead). Note `clear()` is now called after adding (picked set is consumed into real cart lines).

**Gating**: the modal preselect can receive a perfume with no sample stock (e.g. via stale UI) — pool absence just means it renders unselected; acceptable.

- [ ] **Step 2: PDP gating**

In `ProductDetail.tsx` change the TryScentButton condition:

```tsx
          {p.type === 'perfume' && p.sampleStock > 0 && (
```

- [ ] **Step 3: Cart surfaces**

In `CartDrawer.tsx` and `Cart.tsx`:
- Replace the `SAMPLE_PRODUCT` import with `SAMPLE_SIZE_LABEL` from `@herencia/shared`.
- Line size label rendering becomes:

```tsx
<p className="font-body text-xs text-muted">
  {line.sizeLabel === SAMPLE_SIZE_LABEL ? `Sample · ${settingsData?.samples.sizeLabel ?? '5ml'}` : line.sizeLabel}
</p>
```

(CartDrawer already queries settings for the free-shipping bar — reuse that query's data. Cart.tsx: check whether it fetches settings; if not, fall back to the literal default via `DEFAULT_SAMPLES_SETTINGS.sizeLabel`.)
- DELETE the `line.slug === SAMPLE_PRODUCT.slug && samples.length > 0` picked-names blocks and the now-unused `useSamples()` import/destructuring in both files (keep it only if used elsewhere in the file).

In `Checkout.tsx`:
- DELETE the sample-notes IIFE (lines ~147–155) — send `...(form.notes ? { notes: form.notes } : {})` instead.
- Remove the now-unused `SAMPLE_PRODUCT` import and `samples` from `useSamples()` if unused.
- If the order summary prints `line.sizeLabel`, apply the same `SAMPLE_SIZE_LABEL` display mapping as the cart.

- [ ] **Step 4: api.ts filter type**

In `apps/web/src/lib/api.ts`, find the `ProductFilters` type and add `samples?: boolean;`.

- [ ] **Step 5: Run web suite; fix affected tests**

Run (from `apps/web`): `npx vitest run`
Expected: `Checkout.test.tsx` may fail if it asserted the sample-notes behavior — update per the new payload (notes = form notes only). `ProductDetail.test.tsx` may fail if its fixture lacks `sampleStock` — add `sampleStock: 5` to the perfume fixture so the Try button still renders (and its DTO type now requires the field).
All green before committing.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(web): per-perfume sample cart lines + settings-driven modal copy"
```

---

### Task 7: Web admin — ProductForm sampleStock, AdminHome Samples card, Inventory rows

**Files:**
- Modify: `apps/web/src/features/admin/ProductForm.tsx`
- Modify: `apps/web/src/pages/admin/AdminHome.tsx`
- Modify: `apps/web/src/pages/admin/AdminInventory.tsx`

**Interfaces:**
- Consumes: `adminProductSchema.sampleStock`, `updateSettingsSchema.samples` (Task 1/2).
- Produces: admin can set per-perfume sample stock and all samples settings.

- [ ] **Step 1: ProductForm**

In `toFormDefaults`: add `sampleStock: 0,` to the empty defaults and `sampleStock: p.sampleStock,` to the from-product branch. In the JSX, next to the `isFeatured`/`isActive` area (or under the type select), add a perfume-only field (`watch('type') === 'perfume'`):

```tsx
      {watch('type') === 'perfume' && (
        <label className="block">
          <span className="mb-1 block font-body text-sm text-muted">Sample stock (0 = samples not offered)</span>
          <input type="number" min="0" step="1" {...register('sampleStock', { valueAsNumber: true })} className="field-lux" />
        </label>
      )}
```

- [ ] **Step 2: AdminHome Samples card**

Follow the existing card pattern exactly (state → hydrate in the `useEffect` → include in `save()`):

State:

```tsx
  const [samples, setSamples] = useState({
    price: '60', sizeLabel: '5ml', eyebrow: '', heading: '', strapline: '',
    steps: ['', '', ''] as [string, string, string],
    ctaText: '', stickerTop: '', stickerBottom: '', modalTitle: '', modalText: '',
  });
```

Hydrate (inside the existing `useEffect` on `settings.data`):

```tsx
    setSamples({
      price: String(s.samples.price), sizeLabel: s.samples.sizeLabel, eyebrow: s.samples.eyebrow,
      heading: s.samples.heading, strapline: s.samples.strapline, steps: s.samples.steps,
      ctaText: s.samples.ctaText, stickerTop: s.samples.stickerTop, stickerBottom: s.samples.stickerBottom,
      modalTitle: s.samples.modalTitle, modalText: s.samples.modalText,
    });
```

Save payload (inside `mut.mutate({...})`):

```tsx
      samples: {
        ...(Number(samples.price) > 0 ? { price: Number(samples.price) } : {}),
        sizeLabel: samples.sizeLabel || undefined,
        eyebrow: samples.eyebrow || undefined,
        heading: samples.heading || undefined,
        strapline: samples.strapline || undefined,
        steps: samples.steps.every((x) => x.trim()) ? samples.steps : undefined,
        ctaText: samples.ctaText || undefined,
        stickerTop: samples.stickerTop || undefined,
        stickerBottom: samples.stickerBottom || undefined,
        modalTitle: samples.modalTitle || undefined,
        modalText: samples.modalText || undefined,
      },
```

Card JSX (insert after the Shipping card, same classes as the other cards): heading "Samples", helper line "Per-perfume availability is set on each perfume in Products (Sample stock). `{price}` and `{size}` are replaced automatically.", then a 2-col grid with Price (number) + Size label inputs, and full-width inputs for eyebrow, heading (textarea, note "line break = new line"), strapline, the 3 step lines, ctaText, stickerTop + stickerBottom (2-col), modalTitle, modalText (textarea). Every field uses the `field-lux` class and the label pattern of the existing cards.

- [ ] **Step 3: AdminInventory sample rows**

In the `rows` construction add sample pseudo-rows:

```tsx
  const rows: Row[] = (products.data?.items ?? []).flatMap((p) => [
    ...p.sizes.map((s) => ({ id: p.id, name: p.name, type: p.type, size: s.label, price: s.price, stock: s.stock })),
    ...(p.type === 'perfume' && p.sampleStock > 0
      ? [{ id: p.id, name: p.name, type: p.type, size: 'Sample', price: samplePrice, stock: p.sampleStock }]
      : []),
  ]);
```

where `samplePrice` comes from a settings query added at the top of the component:

```tsx
  const settings = useQuery({ queryKey: ['settings'], queryFn: fetchSettings, staleTime: 60_000 });
  const samplePrice = settings.data?.samples.price ?? 60;
```

(Import `fetchSettings`.)

- [ ] **Step 4: Verify in the browser (dev)**

Run `npm run dev` from repo root. Check: Products → edit a perfume → Sample stock field saves; Home → Samples card round-trips; Inventory shows Sample rows. Storefront home shows edited copy; modal offers only sampled perfumes; adding 2 samples yields 2 cart lines; checkout works end-to-end against the LOCAL flow (place ONE test order with a sample and delete it in admin — shared prod DB!).

- [ ] **Step 5: Run all suites + typecheck/lint**

From repo root: `npm run typecheck && npm run lint`; from each of `packages/shared`, `apps/api`, `apps/web`: `npx vitest run`.
Expected: all green.

- [ ] **Step 6: Commit**

```bash
git add apps/web
git commit -m "feat(admin): sample stock per perfume + Samples settings card + inventory rows"
```

---

### Task 8: Retire the sample product — cleanup + seed

**Files:**
- Delete: `apps/api/src/lib/ensureSampleProduct.ts`
- Modify: `apps/api/src/server.ts`, `apps/api/src/serverless-entry.ts` (remove the `ensureSampleProduct()` calls + imports)
- Modify: `packages/shared/src/enums.ts` (delete `SAMPLE_PRODUCT`)
- Modify: `apps/api/src/seed/…` (find via `grep -rn "sample" apps/api/src/seed*`): remove sample-product seeding; give 2 seeded perfumes `sampleStock: 10`
- Modify: any remaining `SAMPLE_PRODUCT` references (`grep -rn "SAMPLE_PRODUCT" packages apps` must end EMPTY)

**Interfaces:** none new — deletion task.

- [ ] **Step 1: Delete + grep clean**

Remove the file, the two boot calls, the constant, seed usage. Run:
`grep -rn "SAMPLE_PRODUCT\|ensureSampleProduct\|sample-box" packages/shared/src apps/api/src apps/web/src`
Expected: no hits (except possibly historical comments — remove those too).

- [ ] **Step 2: Full verification**

From repo root: `npm run typecheck && npm run lint && npm run build`; all three test suites.
Expected: green; build clean.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "refactor: retire the global sample product + seeder"
```

---

### Task 9: Deploy + production migration + live verify

- [ ] **Step 1: Deploy api then web**

```bash
# api (repo root):
VERCEL_ORG_ID=team_Ure2AnJ0L3D21a1MFoAvdkzI VERCEL_PROJECT_ID=prj_jsEInb9ixbaa8QeARmwrImolsBzZ vercel --prod --yes
# web (repo root, default link):
vercel --prod --yes
```

- [ ] **Step 2: Prod data migration**

As admin against `herencia-api-pi.vercel.app`:
1. `DELETE /api/admin/products/6a483d67ffc42f731646cc8b` (the old "Perfume Sample" — id may differ; find by slug `sample-box` first via `GET /api/products/sample-box`).
2. Set `sampleStock` on the perfumes the user wants (ask the user which/how many; default suggestion: all active perfumes, stock 20) via `PUT /api/admin/products/:id` (send the product's current data + `sampleStock`).

- [ ] **Step 3: Live verify**

- `GET /api/settings` → `samples` object present.
- `GET /api/products?samples=true` → the chosen perfumes.
- Browser: home samples section shows settings copy; modal lists the perfumes; add a sample → cart line "Amber Noir / Sample · 5ml"; place ONE real test order (COD) → confirm receipt line + ntfy notification + sampleStock decremented → cancel the order in admin → sampleStock restored → delete the test order.
- Update `docs/memory/current-state.md` + `next-session.md`.

---

## Self-Review (done at planning time)

- **Spec coverage:** data model (T1/T2), priceItems (T3), createOrder/cancel/snapshot+isSample (T4), ThreeSteps/tokens (T5), modal/PDP/cart/checkout (T6), admin surfaces (T7), retirement/seed/migration (T8/T9). Sticker refinement + eyebrow reflected in spec.
- **Type consistency:** `SAMPLE_SIZE_LABEL` (T1) used in T3/T4/T6; `SamplesSettings`/`DEFAULT_SAMPLES_SETTINGS` (T1) in T2/T3/T4/T5/T6/T7; `ProductDTO.sampleStock` (T1/T2) in T6/T7; `OrderItemDTO.isSample` (T1) in T4.
- **Known judgment calls for the implementer:** exact fixture shapes in api tests must be copied from the existing tests in the same file (noted inline); the adminSettings PUT merge must follow the file's existing nested-merge pattern for instapay/emailPopup.
