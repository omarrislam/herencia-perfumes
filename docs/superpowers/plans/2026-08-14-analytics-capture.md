# Analytics Phase 1 (Capture) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record visitor sessions and funnel events first-party, and permanently stamp marketing attribution onto every order, so the dashboard built in Phase 2 has data to read.

**Architecture:** A tiny client tracker queues events and flushes them via `sendBeacon` to a new `POST /api/events`. The server owns everything that matters: it resolves product slugs to ids, derives monetary values from the database, detects bots and device from the user-agent, and writes the `purchase` event itself inside `createOrder`. Raw `Event` and `Session` documents expire after 90 days via TTL indexes; `Order.attribution` is permanent, so revenue attribution outlives the raw data.

**Tech Stack:** TypeScript strict, Express, Mongoose, Zod (shared schemas), React 19 + React Router, Vitest, supertest, mongodb-memory-server.

**Spec:** `docs/superpowers/specs/2026-08-14-analytics-design.md`

## Global Constraints

- **TypeScript strict.** Validate all input with shared Zod schemas (`packages/shared`).
- **Never trust the client with money or database ids.** Values are looked up server-side from the DB; the client sends product *slugs*, never ObjectIds. (Decision #22.)
- **Analytics must never break a user flow.** Every analytics write is wrapped fail-soft; a tracking failure must not fail checkout or any request. (Same rule as `ntfy.ts`.)
- **No unattended jobs.** No cron. (Decision #54.)
- **Retention:** raw `Event` and `Session` expire at **90 days** (`60 * 60 * 24 * 90` seconds).
- **Session window:** 30 minutes of inactivity starts a new session.
- **Mobile-first, Lighthouse ≥ 90.** The tracker must not block navigation — `sendBeacon`, or `fetch` with `keepalive: true` as fallback.
- **No PII in events.** No name, phone, or email is ever written to `Event` or `Session`.
- Run `npm run typecheck` and `npm run lint` from the repo root before every commit.
- Test commands: `npm run test --workspace packages/shared` / `apps/api` / `apps/web`.

---

### Task 1: Shared analytics schemas

**Files:**
- Create: `packages/shared/src/schemas/analytics.ts`
- Create: `packages/shared/src/schemas/analytics.test.ts`
- Modify: `packages/shared/src/index.ts` (add `export * from './schemas/analytics';` at the end)

**Interfaces:**
- Consumes: nothing.
- Produces: `EVENT_TYPES`, `EventType`, `trackEventSchema`, `trackBatchSchema`, `TrackBatchInput`, `AttributionDTO`.

- [ ] **Step 1: Write the failing test**

```ts
// packages/shared/src/schemas/analytics.test.ts
import { describe, it, expect } from 'vitest';
import { trackBatchSchema } from './analytics';

const base = {
  session: { sessionId: 'S1', visitorId: 'V1', landingPath: '/' },
  events: [{ type: 'page_view', path: '/' }],
};

describe('trackBatchSchema', () => {
  it('accepts a minimal valid batch', () => {
    expect(trackBatchSchema.safeParse(base).success).toBe(true);
  });

  it('accepts utm fields and a product slug', () => {
    const parsed = trackBatchSchema.parse({
      session: { ...base.session, utm: { source: 'instagram', medium: 'social' }, referrer: 'https://instagram.com/' },
      events: [{ type: 'product_view', path: '/products/ashes', productSlug: 'ashes' }],
    });
    expect(parsed.session.utm?.source).toBe('instagram');
    expect(parsed.events[0]!.productSlug).toBe('ashes');
  });

  it('rejects an unknown event type', () => {
    const bad = { ...base, events: [{ type: 'hack', path: '/' }] };
    expect(trackBatchSchema.safeParse(bad).success).toBe(false);
  });

  it('strips a client-supplied value — money is server-derived only', () => {
    const parsed = trackBatchSchema.parse({
      ...base,
      events: [{ type: 'add_to_cart', path: '/', productSlug: 'ashes', value: 999999 }],
    });
    expect('value' in parsed.events[0]!).toBe(false);
  });

  it('rejects an empty batch and caps an oversized one', () => {
    expect(trackBatchSchema.safeParse({ ...base, events: [] }).success).toBe(false);
    const many = Array.from({ length: 51 }, () => ({ type: 'page_view' as const, path: '/' }));
    expect(trackBatchSchema.safeParse({ ...base, events: many }).success).toBe(false);
  });

  it('rejects an over-long path rather than storing unbounded strings', () => {
    const bad = { ...base, events: [{ type: 'page_view', path: 'x'.repeat(600) }] };
    expect(trackBatchSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace packages/shared -- analytics`
Expected: FAIL — cannot resolve `./analytics`.

- [ ] **Step 3: Write minimal implementation**

```ts
// packages/shared/src/schemas/analytics.ts
import { z } from 'zod';

export const EVENT_TYPES = ['page_view', 'product_view', 'add_to_cart', 'checkout_started', 'purchase'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

const shortText = z.string().trim().max(500);

// NOTE: `value` is deliberately absent. Monetary amounts are looked up from the
// database server-side; a client-supplied value would be trivially spoofable.
// Zod strips unknown keys by default, so a client that sends one is ignored.
export const trackEventSchema = z.object({
  type: z.enum(EVENT_TYPES),
  path: shortText,
  productSlug: z.string().trim().max(200).optional(),
});

export const trackSessionSchema = z.object({
  sessionId: z.string().trim().min(1).max(64),
  visitorId: z.string().trim().min(1).max(64),
  landingPath: shortText,
  referrer: shortText.optional(),
  utm: z
    .object({
      source: shortText.optional(),
      medium: shortText.optional(),
      campaign: shortText.optional(),
      content: shortText.optional(),
      term: shortText.optional(),
    })
    .optional(),
});

export const trackBatchSchema = z.object({
  session: trackSessionSchema,
  // Bounded so one request can never write an unbounded number of documents.
  events: z.array(trackEventSchema).min(1).max(50),
});

export type TrackBatchInput = z.infer<typeof trackBatchSchema>;

/** Marketing attribution copied onto an Order at creation. Outlives the raw-event TTL. */
export type AttributionDTO = {
  source?: string;
  medium?: string;
  campaign?: string;
  referrer?: string;
  landingPath?: string;
  sessionId?: string;
};
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace packages/shared -- analytics`
Expected: PASS (6 tests). Then add the barrel export and run `npm run typecheck` from the repo root.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/analytics.ts packages/shared/src/schemas/analytics.test.ts packages/shared/src/index.ts
git commit -m "feat(analytics): shared event and session schemas"
```

---

### Task 2: Event and Session models with TTL indexes

**Files:**
- Create: `apps/api/src/models/Event.ts`
- Create: `apps/api/src/models/Session.ts`
- Create: `apps/api/src/models/analytics.test.ts`

**Interfaces:**
- Consumes: `EVENT_TYPES` from Task 1.
- Produces: `Event` / `EventDoc`, `Session` / `SessionDoc`, `RAW_EVENT_TTL_SECONDS`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/models/analytics.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { connectMemory, disconnectMemory } from '../test/db';
import { Event, RAW_EVENT_TTL_SECONDS } from './Event';
import { Session } from './Session';

beforeAll(connectMemory);
afterAll(disconnectMemory);

describe('analytics models', () => {
  it('expires raw events after 90 days', async () => {
    expect(RAW_EVENT_TTL_SECONDS).toBe(60 * 60 * 24 * 90);
    const idx = await Event.collection.indexes();
    const ttl = idx.find((i) => i.expireAfterSeconds !== undefined);
    expect(ttl?.expireAfterSeconds).toBe(RAW_EVENT_TTL_SECONDS);
  });

  it('expires sessions after 90 days', async () => {
    const idx = await Session.collection.indexes();
    const ttl = idx.find((i) => i.expireAfterSeconds !== undefined);
    expect(ttl?.expireAfterSeconds).toBe(RAW_EVENT_TTL_SECONDS);
  });

  it('keeps sessionId unique so upserts cannot duplicate a visit', async () => {
    await Session.create({ sessionId: 'S1', visitorId: 'V1', landingPath: '/' });
    await expect(Session.create({ sessionId: 'S1', visitorId: 'V2', landingPath: '/' })).rejects.toThrow();
  });

  it('rejects an event type outside the enum', async () => {
    await expect(Event.create({ type: 'nope', sessionId: 'S', visitorId: 'V', path: '/' })).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- models/analytics`
Expected: FAIL — cannot resolve `./Event`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/models/Event.ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { EVENT_TYPES } from '@herencia/shared';

/** Raw events are disposable; only the Phase-2 daily rollups are permanent. */
export const RAW_EVENT_TTL_SECONDS = 60 * 60 * 24 * 90;

const eventSchema = new Schema(
  {
    type: { type: String, enum: [...EVENT_TYPES], required: true, index: true },
    sessionId: { type: String, required: true, index: true },
    visitorId: { type: String, required: true, index: true },
    path: { type: String, required: true },
    product: { type: Schema.Types.ObjectId, ref: 'Product' },
    // EGP. Always derived server-side — never read from the request body.
    value: { type: Number },
    orderNumber: { type: String },
    createdAt: { type: Date, default: Date.now, expires: RAW_EVENT_TTL_SECONDS, index: true },
  },
  { timestamps: false },
);

export type EventDoc = InferSchemaType<typeof eventSchema>;
export const Event =
  (mongoose.models.Event as mongoose.Model<EventDoc>) ?? mongoose.model('Event', eventSchema);
```

```ts
// apps/api/src/models/Session.ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';
import { RAW_EVENT_TTL_SECONDS } from './Event';

// One document per visit. UTMs live here rather than on every event.
const sessionSchema = new Schema(
  {
    sessionId: { type: String, required: true, unique: true },
    visitorId: { type: String, required: true, index: true },
    utm: {
      source: { type: String },
      medium: { type: String },
      campaign: { type: String },
      content: { type: String },
      term: { type: String },
    },
    referrer: { type: String },
    landingPath: { type: String, required: true },
    device: { type: String, enum: ['mobile', 'desktop'], default: 'desktop' },
    isBot: { type: Boolean, default: false, index: true },
    startedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    createdAt: { type: Date, default: Date.now, expires: RAW_EVENT_TTL_SECONDS },
  },
  { timestamps: false },
);

export type SessionDoc = InferSchemaType<typeof sessionSchema>;
export const Session =
  (mongoose.models.Session as mongoose.Model<SessionDoc>) ?? mongoose.model('Session', sessionSchema);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace apps/api -- models/analytics`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/models/Event.ts apps/api/src/models/Session.ts apps/api/src/models/analytics.test.ts
git commit -m "feat(analytics): Event and Session models with 90-day TTL"
```

---

### Task 3: User-agent classification

**Files:**
- Create: `apps/api/src/lib/userAgent.ts`
- Create: `apps/api/src/lib/userAgent.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `isBot(ua: string | undefined): boolean`, `deviceFrom(ua: string | undefined): 'mobile' | 'desktop'`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/lib/userAgent.test.ts
import { describe, it, expect } from 'vitest';
import { isBot, deviceFrom } from './userAgent';

const CHROME_DESKTOP =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const IPHONE =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

describe('isBot', () => {
  it.each([
    'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
    'Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)',
    'facebookexternalhit/1.1',
    'Mozilla/5.0 (compatible; AhrefsBot/7.0)',
    'curl/8.4.0',
    'python-requests/2.31.0',
    'Vercel Screenshot Bot',
  ])('flags %s', (ua) => {
    expect(isBot(ua)).toBe(true);
  });

  it('does not flag real browsers', () => {
    expect(isBot(CHROME_DESKTOP)).toBe(false);
    expect(isBot(IPHONE)).toBe(false);
  });

  it('treats a missing user-agent as a bot — real browsers always send one', () => {
    expect(isBot(undefined)).toBe(true);
    expect(isBot('')).toBe(true);
  });
});

describe('deviceFrom', () => {
  it('detects mobile', () => {
    expect(deviceFrom(IPHONE)).toBe('mobile');
    expect(deviceFrom('Mozilla/5.0 (Linux; Android 14; Pixel 8) Mobile Safari/537.36')).toBe('mobile');
  });
  it('defaults to desktop', () => {
    expect(deviceFrom(CHROME_DESKTOP)).toBe('desktop');
    expect(deviceFrom(undefined)).toBe('desktop');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- userAgent`
Expected: FAIL — cannot resolve `./userAgent`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/lib/userAgent.ts

// Deliberately broad: over-flagging a crawler costs one uncounted session,
// under-flagging inflates every funnel number in the dashboard.
const BOT_PATTERN =
  /bot|crawl|spider|slurp|facebookexternalhit|whatsapp|telegram|preview|screenshot|headless|phantom|puppeteer|playwright|lighthouse|curl|wget|python-requests|axios|go-http|java\/|okhttp|scrapy|monitor|uptime|pingdom|semrush|ahrefs|mj12|dotbot|petalbot|bytespider|gptbot|claudebot|ccbot|perplexity/i;

const MOBILE_PATTERN = /mobile|android|iphone|ipad|ipod|windows phone|iemobile|blackberry|opera mini/i;

/** A missing UA counts as a bot: every real browser sends one. */
export function isBot(ua: string | undefined): boolean {
  if (!ua) return true;
  return BOT_PATTERN.test(ua);
}

export function deviceFrom(ua: string | undefined): 'mobile' | 'desktop' {
  if (!ua) return 'desktop';
  return MOBILE_PATTERN.test(ua) ? 'mobile' : 'desktop';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace apps/api -- userAgent`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/lib/userAgent.ts apps/api/src/lib/userAgent.test.ts
git commit -m "feat(analytics): user-agent bot and device classification"
```

---

### Task 4: Event ingestion endpoint

**Files:**
- Create: `apps/api/src/modules/analytics/service.ts`
- Create: `apps/api/src/routes/events.ts`
- Create: `apps/api/src/routes/events.test.ts`
- Modify: `apps/api/src/middleware/rateLimit.ts` (append `eventsLimiter`)
- Modify: `apps/api/src/app.ts` (register the router next to the other `app.use('/api', …)` lines, **before** `app.use('/api', notFound)`)

**Interfaces:**
- Consumes: `trackBatchSchema` (Task 1), `Event`/`Session` (Task 2), `isBot`/`deviceFrom` (Task 3).
- Produces: `ingestBatch(input: TrackBatchInput, ua: string | undefined): Promise<void>`, `recordPurchase(args)` (used by Task 5), `eventsRouter()`, `eventsLimiter`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/routes/events.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { Event } from '../models/Event';
import { Session } from '../models/Session';
import { Product } from '../models/Product';
import { ScentFamily } from '../models/ScentFamily';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
const CHROME =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

async function makeProduct() {
  const fam = await ScentFamily.create({ name: 'Woody', slug: 'woody', order: 1 });
  return Product.create({
    name: 'Ashes', slug: 'ashes', type: 'perfume', shortDesc: 'x', description: 'x',
    images: ['img'], sizes: [{ label: '55ml', price: 500, stock: 5 }],
    scentFamily: fam._id, gender: 'unisex', concentration: 'EDP', isActive: true,
  });
}

const body = (over = {}) => ({
  session: { sessionId: 'S1', visitorId: 'V1', landingPath: '/' },
  events: [{ type: 'page_view', path: '/' }],
  ...over,
});

describe('POST /api/events', () => {
  it('stores the session and its events', async () => {
    await request(app).post('/api/events').set('User-Agent', CHROME).send(body()).expect(204);
    expect(await Session.countDocuments({ sessionId: 'S1' })).toBe(1);
    expect(await Event.countDocuments({ type: 'page_view' })).toBe(1);
  });

  it('keeps the first UTMs when a later batch arrives without them', async () => {
    await request(app).post('/api/events').set('User-Agent', CHROME)
      .send(body({ session: { sessionId: 'S1', visitorId: 'V1', landingPath: '/', utm: { source: 'instagram' } } }))
      .expect(204);
    await request(app).post('/api/events').set('User-Agent', CHROME).send(body()).expect(204);
    const s = await Session.findOne({ sessionId: 'S1' }).lean();
    expect(s!.utm?.source).toBe('instagram');
  });

  it('derives add_to_cart value from the database, ignoring any client value', async () => {
    await makeProduct();
    await request(app).post('/api/events').set('User-Agent', CHROME)
      .send(body({ events: [{ type: 'add_to_cart', path: '/products/ashes', productSlug: 'ashes', value: 999999 }] }))
      .expect(204);
    const e = await Event.findOne({ type: 'add_to_cart' }).lean();
    expect(e!.value).toBe(500);
  });

  it('drops an event whose product slug matches nothing', async () => {
    await request(app).post('/api/events').set('User-Agent', CHROME)
      .send(body({ events: [{ type: 'product_view', path: '/products/ghost', productSlug: 'ghost' }] }))
      .expect(204);
    expect(await Event.countDocuments()).toBe(0);
  });

  it('flags a crawler session so it can be excluded from reports', async () => {
    await request(app).post('/api/events').set('User-Agent', 'Googlebot/2.1').send(body()).expect(204);
    const s = await Session.findOne({ sessionId: 'S1' }).lean();
    expect(s!.isBot).toBe(true);
  });

  it('records device from the user-agent, not the client', async () => {
    await request(app).post('/api/events')
      .set('User-Agent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148')
      .send(body()).expect(204);
    const s = await Session.findOne({ sessionId: 'S1' }).lean();
    expect(s!.device).toBe('mobile');
  });

  it('rejects a malformed batch with 400', async () => {
    await request(app).post('/api/events').set('User-Agent', CHROME)
      .send({ session: { sessionId: 'S1' }, events: [] }).expect(400);
  });

  it('never stores PII even if the client sends it', async () => {
    await request(app).post('/api/events').set('User-Agent', CHROME)
      .send(body({ session: { sessionId: 'S1', visitorId: 'V1', landingPath: '/', phone: '01012345678', email: 'a@b.c' } }))
      .expect(204);
    const s = await Session.findOne({ sessionId: 'S1' }).lean();
    expect(JSON.stringify(s)).not.toContain('01012345678');
    expect(JSON.stringify(s)).not.toContain('a@b.c');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- routes/events`
Expected: FAIL — 404 on `/api/events` (the router does not exist yet).

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/modules/analytics/service.ts
import type { TrackBatchInput } from '@herencia/shared';
import { Event } from '../../models/Event';
import { Session } from '../../models/Session';
import { Product } from '../../models/Product';
import { isBot, deviceFrom } from '../../lib/userAgent';

/**
 * Writes one batch of tracked events.
 *
 * The server is authoritative for everything that could be gamed: product ids are
 * resolved from slugs, monetary values are read from the catalog, and bot/device
 * classification comes from the user-agent. The request body only supplies
 * navigation shape.
 */
export async function ingestBatch(input: TrackBatchInput, ua: string | undefined): Promise<void> {
  const { session, events } = input;

  // $setOnInsert for the landing facts: a later batch in the same visit must not
  // overwrite the campaign that brought the visitor in.
  await Session.updateOne(
    { sessionId: session.sessionId },
    {
      $setOnInsert: {
        visitorId: session.visitorId,
        landingPath: session.landingPath,
        referrer: session.referrer,
        utm: session.utm ?? {},
        device: deviceFrom(ua),
        isBot: isBot(ua),
        startedAt: new Date(),
        createdAt: new Date(),
      },
      $set: { lastSeenAt: new Date() },
    },
    { upsert: true },
  );

  const slugs = [...new Set(events.map((e) => e.productSlug).filter((s): s is string => !!s))];
  const products = slugs.length
    ? await Product.find({ slug: { $in: slugs }, isActive: true }).select('slug basePrice').lean()
    : [];
  const bySlug = new Map(products.map((p) => [p.slug, p]));

  const docs = events.flatMap((e) => {
    const product = e.productSlug ? bySlug.get(e.productSlug) : undefined;
    // An event naming a product we cannot resolve is noise — drop it rather than
    // storing a dangling reference the dashboard would have to defend against.
    if (e.productSlug && !product) return [];
    return [{
      type: e.type,
      sessionId: session.sessionId,
      visitorId: session.visitorId,
      path: e.path,
      product: product?._id,
      value: e.type === 'add_to_cart' ? product?.basePrice : undefined,
      createdAt: new Date(),
    }];
  });

  if (docs.length) await Event.insertMany(docs, { ordered: false });
}

/** Called by createOrder — the purchase event is server-side, never client-reported. */
export async function recordPurchase(args: {
  sessionId?: string;
  visitorId?: string;
  orderNumber: string;
  total: number;
}): Promise<void> {
  if (!args.sessionId || !args.visitorId) return;
  await Event.create({
    type: 'purchase',
    sessionId: args.sessionId,
    visitorId: args.visitorId,
    path: '/checkout',
    orderNumber: args.orderNumber,
    value: args.total,
    createdAt: new Date(),
  });
}
```

```ts
// apps/api/src/routes/events.ts
import { Router } from 'express';
import { trackBatchSchema } from '@herencia/shared';
import { ingestBatch } from '../modules/analytics/service';
import { eventsLimiter } from '../middleware/rateLimit';
import { HttpError } from '../lib/httpError';

export function eventsRouter(): Router {
  const router = Router();

  router.post('/events', eventsLimiter, async (req, res, next) => {
    const parsed = trackBatchSchema.safeParse(req.body);
    if (!parsed.success) return next(new HttpError(400, 'Invalid tracking payload', 'invalid_payload'));

    try {
      await ingestBatch(parsed.data, req.get('user-agent'));
    } catch (err) {
      // Analytics must never surface to a visitor. Log and swallow.
      console.error('[events] ingest failed', err);
    }
    res.status(204).end();
  });

  return router;
}
```

Append to `apps/api/src/middleware/rateLimit.ts`:

```ts
// Every visitor hits this, not just writers, and events are batched client-side —
// so the ceiling is far higher than the write limiters. Generous by design:
// dropping real analytics is worse than absorbing a little noise.
export const eventsLimiter = makeLimiter({ windowMs: 60 * 1000, max: 60 });
```

> **Note on `HttpError` import path:** confirm the actual module path with
> `grep -rn "class HttpError" apps/api/src` and use whatever the rest of the routes import.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace apps/api -- routes/events`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/analytics apps/api/src/routes/events.ts apps/api/src/routes/events.test.ts apps/api/src/middleware/rateLimit.ts apps/api/src/app.ts
git commit -m "feat(analytics): POST /api/events ingestion with server-derived values"
```

---

### Task 5: Order attribution and the server-side purchase event

**Files:**
- Modify: `apps/api/src/models/Order.ts` (add `attribution` sub-document)
- Modify: `packages/shared/src/schemas/order.ts` (add optional `sessionId` + `visitorId` to `createOrderSchema`; add `attribution` to `OrderDTO`)
- Modify: `apps/api/src/modules/order/service.ts` (`createOrder`)
- Modify: `apps/api/src/lib/serialize.ts` (expose `attribution` on the order DTO)
- Modify: `apps/api/src/modules/order/service.test.ts` (add the cases below)

**Interfaces:**
- Consumes: `recordPurchase` (Task 4), `Session` (Task 2), `AttributionDTO` (Task 1).
- Produces: `Order.attribution` populated at creation — Phase 2's traffic-source report reads this and nothing else for revenue.

- [ ] **Step 1: Write the failing test**

```ts
// add to apps/api/src/modules/order/service.test.ts
import { Session } from '../../models/Session';
import { Event } from '../../models/Event';

describe('createOrder — analytics attribution', () => {
  it('stamps the session campaign onto the order permanently', async () => {
    await Session.create({
      sessionId: 'S1', visitorId: 'V1', landingPath: '/products/ashes',
      referrer: 'https://instagram.com/', utm: { source: 'instagram', medium: 'social', campaign: 'launch' },
    });
    const res = await createOrder({ ...validOrderInput, sessionId: 'S1', visitorId: 'V1' });
    const order = await Order.findOne({ orderNumber: res.orderNumber }).lean();
    expect(order!.attribution).toMatchObject({
      source: 'instagram', medium: 'social', campaign: 'launch', landingPath: '/products/ashes',
    });
  });

  it('writes exactly one purchase event carrying the real order total', async () => {
    await Session.create({ sessionId: 'S1', visitorId: 'V1', landingPath: '/' });
    const res = await createOrder({ ...validOrderInput, sessionId: 'S1', visitorId: 'V1' });
    const events = await Event.find({ type: 'purchase' }).lean();
    expect(events).toHaveLength(1);
    expect(events[0]!.orderNumber).toBe(res.orderNumber);
    expect(events[0]!.value).toBe(res.total);
  });

  it('still creates the order when no session is supplied', async () => {
    const res = await createOrder(validOrderInput);
    expect(res.orderNumber).toBeTruthy();
    const order = await Order.findOne({ orderNumber: res.orderNumber }).lean();
    expect(order!.attribution?.source).toBeUndefined();
    expect(await Event.countDocuments({ type: 'purchase' })).toBe(0);
  });

  it('still creates the order when the sessionId is unknown', async () => {
    const res = await createOrder({ ...validOrderInput, sessionId: 'GHOST', visitorId: 'V9' });
    expect(res.orderNumber).toBeTruthy();
  });
});
```

> Reuse whatever the existing `service.test.ts` already uses to build a valid order;
> name it `validOrderInput` if no such helper exists yet and extract it from an existing test.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- order/service`
Expected: FAIL — `attribution` is undefined and no purchase event is written.

- [ ] **Step 3: Write minimal implementation**

Add to the `orderSchema` in `apps/api/src/models/Order.ts`, after `notes`:

```ts
    // Copied from the visitor's Session at creation. Kept on the order so revenue
    // attribution survives the 90-day raw-event TTL.
    attribution: {
      source: { type: String },
      medium: { type: String },
      campaign: { type: String },
      referrer: { type: String },
      landingPath: { type: String },
      sessionId: { type: String },
    },
```

Add to `createOrderSchema` in `packages/shared/src/schemas/order.ts`:

```ts
  // Analytics correlation only — never used for pricing or identity.
  sessionId: z.string().trim().max(64).optional(),
  visitorId: z.string().trim().max(64).optional(),
```

In `apps/api/src/modules/order/service.ts`, resolve attribution **before** creating the
order, then record the purchase **after** it exists:

```ts
// near the other imports
import { Session } from '../../models/Session';
import { recordPurchase } from '../analytics/service';

// inside createOrder, before the Order document is created:
let attribution: Record<string, string | undefined> | undefined;
if (input.sessionId) {
  // Fail-soft: analytics must never block a sale.
  const s = await Session.findOne({ sessionId: input.sessionId }).lean().catch(() => null);
  if (s) {
    attribution = {
      source: s.utm?.source,
      medium: s.utm?.medium,
      campaign: s.utm?.campaign,
      referrer: s.referrer,
      landingPath: s.landingPath,
      sessionId: s.sessionId,
    };
  }
}
// …pass `attribution` into the Order.create({ … }) call.

// after the order document exists and stock has been decremented:
await recordPurchase({
  sessionId: input.sessionId,
  visitorId: input.visitorId,
  orderNumber: order.orderNumber,
  total: order.total,
}).catch((err) => console.error('[analytics] purchase event failed', err));
```

Expose it in `apps/api/src/lib/serialize.ts` on the order DTO:

```ts
  attribution: doc.attribution
    ? {
        source: doc.attribution.source ?? undefined,
        medium: doc.attribution.medium ?? undefined,
        campaign: doc.attribution.campaign ?? undefined,
        referrer: doc.attribution.referrer ?? undefined,
        landingPath: doc.attribution.landingPath ?? undefined,
        sessionId: doc.attribution.sessionId ?? undefined,
      }
    : undefined,
```

and add `attribution?: AttributionDTO;` to `OrderDTO` in `packages/shared/src/schemas/order.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace apps/api` (whole suite — `createOrder` is widely covered, so watch for regressions).
Expected: PASS, with the 4 new tests included and no existing test broken.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/models/Order.ts apps/api/src/modules/order/service.ts apps/api/src/modules/order/service.test.ts apps/api/src/lib/serialize.ts packages/shared/src/schemas/order.ts
git commit -m "feat(analytics): stamp attribution on orders and record purchases server-side"
```

---

### Task 6: Client tracker

**Files:**
- Create: `apps/web/src/lib/analytics.ts`
- Create: `apps/web/src/lib/analytics.test.ts`

**Interfaces:**
- Consumes: `POST /api/events` (Task 4).
- Produces: `getVisitorId()`, `getSessionId()`, `track(type, opts?)`, `flush()`, `currentIds()` — all imported by Task 7.

- [ ] **Step 1: Write the failing test**

```ts
// apps/web/src/lib/analytics.test.ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { getVisitorId, getSessionId, track, flush, SESSION_IDLE_MS } from './analytics';

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.useRealTimers();
});
afterEach(() => vi.restoreAllMocks());

describe('identity', () => {
  it('keeps one visitor id across calls', () => {
    expect(getVisitorId()).toBe(getVisitorId());
  });
  it('keeps the session id within the idle window', () => {
    expect(getSessionId()).toBe(getSessionId());
  });
  it('starts a new session after 30 minutes idle', () => {
    const first = getSessionId();
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + SESSION_IDLE_MS + 1000);
    expect(getSessionId()).not.toBe(first);
  });
});

describe('flush', () => {
  it('sends queued events via sendBeacon', async () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon });
    track('page_view', { path: '/' });
    await flush();
    expect(beacon).toHaveBeenCalledTimes(1);
    const body = JSON.parse((beacon.mock.calls[0]![1] as Blob & { _text?: string })._text ?? '{}');
    expect(body.events[0].type).toBe('page_view');
  });

  it('falls back to keepalive fetch when sendBeacon is unavailable', async () => {
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });
    const f = vi.fn(async () => new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', f);
    track('page_view', { path: '/' });
    await flush();
    expect(f).toHaveBeenCalled();
    expect(f.mock.calls[0]![1]).toMatchObject({ keepalive: true });
  });

  it('does nothing when the queue is empty', async () => {
    const beacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: beacon });
    await flush();
    expect(beacon).not.toHaveBeenCalled();
  });

  it('never throws when the network fails', async () => {
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    track('page_view', { path: '/' });
    await expect(flush()).resolves.toBeUndefined();
  });
});

describe('utm capture', () => {
  it('captures campaign params from the landing url once', () => {
    history.replaceState({}, '', '/?utm_source=instagram&utm_medium=social');
    const a = getSessionId();
    history.replaceState({}, '', '/products/ashes');
    expect(getSessionId()).toBe(a); // same session
    track('page_view', { path: '/products/ashes' });
    // UTMs are read at session start, so a later navigation cannot overwrite them.
    expect(sessionStorage.getItem('herencia.utm')).toContain('instagram');
  });
});
```

> The `sendBeacon` body assertion depends on how the Blob is constructed. If reading
> `_text` proves awkward in jsdom, send a `string` body to `sendBeacon` instead of a Blob
> and assert on it directly — both are valid `BodyInit` and the string form is simpler to test.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/web -- analytics`
Expected: FAIL — cannot resolve `./analytics`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/lib/analytics.ts
import type { EventType } from '@herencia/shared';

export const SESSION_IDLE_MS = 30 * 60 * 1000;

const VISITOR_KEY = 'herencia.visitor';
const SESSION_KEY = 'herencia.session';
const SEEN_KEY = 'herencia.session.seen';
const UTM_KEY = 'herencia.utm';
const LANDING_KEY = 'herencia.landing';
const REFERRER_KEY = 'herencia.referrer';

const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '');

function rid(): string {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/-/g, '');
}

function safeGet(store: Storage, key: string): string | null {
  try { return store.getItem(key); } catch { return null; }
}
function safeSet(store: Storage, key: string, value: string): void {
  try { store.setItem(key, value); } catch { /* private mode / storage full */ }
}

export function getVisitorId(): string {
  const existing = safeGet(localStorage, VISITOR_KEY);
  if (existing) return existing;
  const id = rid();
  safeSet(localStorage, VISITOR_KEY, id);
  return id;
}

/** A new id once the visitor has been idle for SESSION_IDLE_MS. */
export function getSessionId(): string {
  const now = Date.now();
  const existing = safeGet(sessionStorage, SESSION_KEY);
  const seen = Number(safeGet(sessionStorage, SEEN_KEY) ?? 0);

  if (existing && now - seen < SESSION_IDLE_MS) {
    safeSet(sessionStorage, SEEN_KEY, String(now));
    return existing;
  }

  const id = rid();
  safeSet(sessionStorage, SESSION_KEY, id);
  safeSet(sessionStorage, SEEN_KEY, String(now));
  // Landing facts are captured exactly once, at session start: a later in-app
  // navigation must not overwrite the campaign that brought the visitor in.
  const params = new URLSearchParams(location.search);
  const utm = {
    source: params.get('utm_source') ?? undefined,
    medium: params.get('utm_medium') ?? undefined,
    campaign: params.get('utm_campaign') ?? undefined,
    content: params.get('utm_content') ?? undefined,
    term: params.get('utm_term') ?? undefined,
  };
  safeSet(sessionStorage, UTM_KEY, JSON.stringify(utm));
  safeSet(sessionStorage, LANDING_KEY, location.pathname);
  safeSet(sessionStorage, REFERRER_KEY, document.referrer || '');
  return id;
}

export function currentIds(): { sessionId: string; visitorId: string } {
  return { sessionId: getSessionId(), visitorId: getVisitorId() };
}

type Queued = { type: EventType; path: string; productSlug?: string };
let queue: Queued[] = [];

export function track(type: EventType, opts: { path?: string; productSlug?: string } = {}): void {
  queue.push({ type, path: opts.path ?? location.pathname, productSlug: opts.productSlug });
  if (queue.length >= 20) void flush();
}

export async function flush(): Promise<void> {
  if (queue.length === 0) return;
  const events = queue.slice(0, 50);
  queue = queue.slice(50);

  const sessionId = getSessionId();
  let utm: Record<string, string | undefined> = {};
  try { utm = JSON.parse(safeGet(sessionStorage, UTM_KEY) ?? '{}'); } catch { /* ignore */ }

  const payload = JSON.stringify({
    session: {
      sessionId,
      visitorId: getVisitorId(),
      landingPath: safeGet(sessionStorage, LANDING_KEY) ?? location.pathname,
      referrer: safeGet(sessionStorage, REFERRER_KEY) || undefined,
      utm,
    },
    events,
  });

  const url = `${API_BASE}/api/events`;
  try {
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url, payload);
      return;
    }
    // keepalive lets the request outlive the page during a navigation.
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    });
  } catch {
    // Tracking is best-effort and must never surface to the visitor.
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace apps/web -- analytics`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/analytics.ts apps/web/src/lib/analytics.test.ts
git commit -m "feat(analytics): client tracker with session window and beacon flush"
```

---

### Task 7: Wire the tracker into the storefront

**Files:**
- Create: `apps/web/src/features/analytics/usePageTracking.ts`
- Create: `apps/web/src/features/analytics/usePageTracking.test.tsx`
- Modify: `apps/web/src/app/AppRoutes.tsx` (call the hook once, inside the router)
- Modify: `apps/web/src/pages/ProductDetail.tsx` (fire `product_view` when the product loads)
- Modify: `apps/web/src/components/ProductCard.tsx` and `apps/web/src/pages/ProductDetail.tsx` and `apps/web/src/features/samples/SampleModal.tsx` (fire `add_to_cart` at each call site — see Step 3)
- Modify: `apps/web/src/pages/Checkout.tsx` (fire `checkout_started` on mount; send `sessionId`/`visitorId` with the order)

**Interfaces:**
- Consumes: `track`, `flush`, `currentIds` (Task 6); `sessionId`/`visitorId` on `createOrderSchema` (Task 5).
- Produces: nothing downstream — this is the last task of Phase 1.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/features/analytics/usePageTracking.test.tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { usePageTracking } from './usePageTracking';
import * as analytics from '../../lib/analytics';

function Harness() {
  usePageTracking();
  const nav = useNavigate();
  return <button onClick={() => nav('/products')}>go</button>;
}

beforeEach(() => vi.spyOn(analytics, 'track').mockImplementation(() => {}));
afterEach(() => vi.restoreAllMocks());

describe('usePageTracking', () => {
  it('fires a page_view for the first render', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route path="/" element={<Harness />} /></Routes>
      </MemoryRouter>,
    );
    expect(analytics.track).toHaveBeenCalledWith('page_view', { path: '/' });
  });

  it('fires another page_view on route change — a SPA never reloads', async () => {
    const { getByText } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<Harness />} />
          <Route path="/products" element={<Harness />} />
        </Routes>
      </MemoryRouter>,
    );
    getByText('go').click();
    await vi.waitFor(() =>
      expect(analytics.track).toHaveBeenCalledWith('page_view', { path: '/products' }),
    );
  });

  it('does not fire twice for the same path', () => {
    const { rerender } = render(
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route path="/" element={<Harness />} /></Routes>
      </MemoryRouter>,
    );
    rerender(
      <MemoryRouter initialEntries={['/']}>
        <Routes><Route path="/" element={<Harness />} /></Routes>
      </MemoryRouter>,
    );
    const pageViews = (analytics.track as unknown as { mock: { calls: unknown[][] } }).mock.calls
      .filter((c) => c[0] === 'page_view');
    expect(pageViews).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/web -- usePageTracking`
Expected: FAIL — cannot resolve `./usePageTracking`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/web/src/features/analytics/usePageTracking.ts
import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { track, flush } from '../../lib/analytics';

/**
 * Fires page_view on every route change. Mounted once, inside the router.
 *
 * A SPA only loads the document once, so without this the entire visit would look
 * like a single pageview no matter how much the visitor browsed.
 */
export function usePageTracking(): void {
  const { pathname } = useLocation();
  const last = useRef<string | null>(null);

  useEffect(() => {
    if (last.current === pathname) return;
    last.current = pathname;
    track('page_view', { path: pathname });
    void flush();
  }, [pathname]);

  // A visitor who closes the tab still has queued events worth keeping.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === 'hidden') void flush(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, []);
}
```

Then wire the remaining call sites:

- `AppRoutes.tsx` — call `usePageTracking()` at the top of the component.
- `ProductDetail.tsx` — after the product query resolves:
  ```ts
  useEffect(() => {
    if (product.data) track('product_view', { path: `/products/${product.data.slug}`, productSlug: product.data.slug });
  }, [product.data?.slug]);
  ```
- **`add_to_cart` fires at the call sites, not inside `CartContext`.** `addItem` receives
  `{ productId, sizeLabel, qty }` and has no slug, and the client must never send a
  database id (Global Constraints). Every caller already holds the full product, so track
  there and keep the cart free of analytics knowledge:

  ```ts
  // ProductCard.tsx — in addToCart(), after addItem(...)
  track('add_to_cart', { productSlug: product.slug });

  // ProductDetail.tsx — in its add-to-cart handler, after addItem(...)
  track('add_to_cart', { productSlug: p.slug });
  ```

  `SampleModal.tsx` adds sample lines the same way; track those with the perfume's own
  slug so sample interest shows up against the right product.
- `Checkout.tsx` — `useEffect(() => { track('checkout_started'); void flush(); }, [])`, and
  spread `currentIds()` into the `createOrder` payload.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace apps/web` (whole suite, to catch regressions in Cart/Checkout/PDP tests).
Expected: PASS, including the 3 new hook tests.

- [ ] **Step 5: Verify end to end against a local server, then commit**

```bash
# terminal 1
npm run dev
# terminal 2 — after browsing the site, confirm documents exist:
#   sessions: 1+, events: page_view + product_view + add_to_cart
```

Confirm in the browser Network tab that `/api/events` returns **204** and is sent as a
beacon (it should not delay navigation).

```bash
git add apps/web/src/features/analytics apps/web/src/app/AppRoutes.tsx apps/web/src/pages/ProductDetail.tsx apps/web/src/components/ProductCard.tsx apps/web/src/features/samples/SampleModal.tsx apps/web/src/pages/Checkout.tsx
git commit -m "feat(analytics): track pageviews, product views, add-to-cart and checkout"
```

---

## Final verification (run before deploying)

- [ ] `npm run typecheck` — clean
- [ ] `npm run lint` — clean
- [ ] `npm run test --workspace packages/shared` — expect 67 + 6 = **73**
- [ ] `npm run test --workspace apps/api` — expect 224 + 27 = **251**
- [ ] `npm run test --workspace apps/web` — expect 74 + 12 = **86**
- [ ] `npm run build` — clean, all three bake steps run
- [ ] **Deploy api before web** (decision #59 — the web build fetches `/api/seo/prerender`)
- [ ] After deploy, browse production, then confirm `sessions` and `events` collections are
      filling and that a real order carries `attribution`.

## Phase 2

The dashboard (`DailyStat` rollups, `/admin/analytics`, funnel, revenue chart, sources
table, phone-keyed cohorts) is a **separate plan**, written once Phase 1 is live and there
is real data to build against. Phase 1 delivers working, useful software on its own: from
the moment it ships, every visit and every order's origin is being recorded.
