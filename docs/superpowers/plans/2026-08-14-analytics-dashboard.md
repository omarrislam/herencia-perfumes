# Analytics Phase 2 (Dashboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the events captured in Phase 1 into an `/admin/analytics` page answering the four questions the owner asked for: where do people drop off, how is revenue trending, which campaigns work, and do customers come back.

**Architecture:** A permanent `DailyStat` document per day, computed **lazily** — the stats endpoint rolls up any missing past day on request and computes today live from raw events. No cron. Money always comes from `Order` (authoritative, unaffected by ad blockers); only top-of-funnel counts come from events. Charts are hand-rolled SVG.

**Tech Stack:** TypeScript strict, Express, Mongoose aggregation, Zod, React 19, Vitest, supertest, mongodb-memory-server.

**Spec:** `docs/superpowers/specs/2026-08-14-analytics-design.md`

## Global Constraints

- **No cron / no unattended jobs** (decision #54). Rollups are lazy and **idempotent** — recomputing a day overwrites, never accumulates.
- **Money comes from `Order`, never from events.** Events can be blocked by ad blockers; orders cannot. Funnel `orders`/`revenue` = non-cancelled orders, matching the existing `/api/admin/stats` convention.
- **Bot sessions are excluded from every aggregate** (`Session.isBot: false`).
- **Traffic sources**: sessions from `DailyStat.bySource`, orders/revenue from `Order.attribution` — so the table survives past the 90-day raw TTL.
- **Customer identity is the normalised phone** (decision #63 / #52 / #55). Reuse `egyptianPhoneSchema`'s normalisation.
- **No charting library.** Hand-rolled SVG; Lighthouse ≥ 90 budget. Admin code is lazy-loaded.
- All new admin routes sit behind the existing admin auth in `routes/admin.ts`.
- Run `npm run typecheck` and `npm run lint` from the repo root before every commit.

---

### Task 1: DailyStat model and idempotent per-day rollup

**Files:**
- Create: `apps/api/src/models/DailyStat.ts`
- Create: `apps/api/src/modules/analytics/rollup.ts`
- Create: `apps/api/src/modules/analytics/rollup.test.ts`

**Interfaces:**
- Consumes: `Event`, `Session` (Phase 1), `Order`.
- Produces: `DailyStat`, `dayKey(d: Date): string`, `rollupDay(key: string): Promise<void>`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/analytics/rollup.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectMemory, disconnectMemory, clearDb } from '../../test/db';
import { Event } from '../../models/Event';
import { Session } from '../../models/Session';
import { Order } from '../../models/Order';
import { DailyStat } from '../../models/DailyStat';
import { rollupDay, dayKey } from './rollup';

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

const DAY = '2026-08-10';
const at = (h: number) => new Date(`${DAY}T${String(h).padStart(2, '0')}:00:00.000Z`);

async function session(id: string, over: Record<string, unknown> = {}) {
  return Session.create({
    sessionId: id, visitorId: `v-${id}`, landingPath: '/', isBot: false,
    createdAt: at(9), startedAt: at(9), lastSeenAt: at(9), ...over,
  });
}
async function ev(type: string, sessionId: string, over: Record<string, unknown> = {}) {
  return Event.create({ type, sessionId, visitorId: `v-${sessionId}`, path: '/', createdAt: at(10), ...over });
}
async function order(total: number, over: Record<string, unknown> = {}) {
  return Order.create({
    orderNumber: `HRC-${Math.random().toString(36).slice(2, 8)}`,
    items: [{ product: undefined, name: 'X', sizeLabel: '55ml', unitPrice: total, qty: 1 }],
    customer: { name: 'Mai', phone: '01012345678' },
    shippingAddress: { line1: 'a', city: 'Cairo', governorate: 'Cairo', phone: '01012345678' },
    subtotal: total, shipping: 0, total, status: 'confirmed', createdAt: at(11), ...over,
  });
}

describe('dayKey', () => {
  it('formats a date as YYYY-MM-DD', () => {
    expect(dayKey(new Date('2026-08-10T23:30:00.000Z'))).toBe('2026-08-10');
  });
});

describe('rollupDay', () => {
  it('counts sessions, funnel steps and revenue for the day', async () => {
    await session('a');
    await session('b');
    await ev('page_view', 'a');
    await ev('product_view', 'a');
    await ev('add_to_cart', 'a');
    await ev('checkout_started', 'a');
    await order(560);
    await order(440);

    await rollupDay(DAY);

    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d).toMatchObject({
      sessions: 2, productViews: 1, addToCarts: 1, checkoutStarts: 1, orders: 2, revenue: 1000,
    });
  });

  it('takes orders and revenue from Order, not from purchase events', async () => {
    // Ad blockers can drop events; they cannot drop an order.
    await session('a');
    await order(560);
    await rollupDay(DAY);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d!.orders).toBe(1);
    expect(d!.revenue).toBe(560);
  });

  it('excludes cancelled orders from revenue', async () => {
    await order(560);
    await order(999, { status: 'cancelled' });
    await rollupDay(DAY);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d!.orders).toBe(1);
    expect(d!.revenue).toBe(560);
  });

  it('excludes bot sessions and their events', async () => {
    await session('human');
    await session('crawler', { isBot: true });
    await ev('product_view', 'human');
    await ev('product_view', 'crawler');
    await rollupDay(DAY);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d!.sessions).toBe(1);
    expect(d!.productViews).toBe(1);
  });

  it('is idempotent — recomputing overwrites rather than accumulating', async () => {
    await session('a');
    await order(560);
    await rollupDay(DAY);
    await rollupDay(DAY);
    expect(await DailyStat.countDocuments({ date: DAY })).toBe(1);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d!.sessions).toBe(1);
    expect(d!.revenue).toBe(560);
  });

  it('groups sessions by campaign', async () => {
    await session('a', { utm: { source: 'instagram', medium: 'social', campaign: 'launch' } });
    await session('b', { utm: { source: 'instagram', medium: 'social', campaign: 'launch' } });
    await session('c');
    await rollupDay(DAY);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    const ig = d!.bySource.find((s) => s.source === 'instagram');
    expect(ig).toMatchObject({ medium: 'social', campaign: 'launch', sessions: 2 });
    expect(d!.bySource.find((s) => s.source === 'direct')?.sessions).toBe(1);
  });

  it('buckets a referrer without utm by its host, not as direct', async () => {
    await session('a', { referrer: 'https://www.google.com/search?q=perfume' });
    await rollupDay(DAY);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d!.bySource.find((s) => s.source === 'google.com')?.sessions).toBe(1);
  });

  it('writes a zero row for a day with no activity', async () => {
    await rollupDay(DAY);
    const d = await DailyStat.findOne({ date: DAY }).lean();
    expect(d).toMatchObject({ sessions: 0, orders: 0, revenue: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- analytics/rollup`
Expected: FAIL — cannot resolve `./rollup`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/models/DailyStat.ts
import mongoose, { Schema, type InferSchemaType } from 'mongoose';

// Permanent. Raw events expire at 90 days; these rollups are the long-range history,
// so they are never given a TTL.
const dailyStatSchema = new Schema(
  {
    date: { type: String, required: true, unique: true }, // YYYY-MM-DD (UTC)
    sessions: { type: Number, default: 0 },
    visitors: { type: Number, default: 0 },
    productViews: { type: Number, default: 0 },
    addToCarts: { type: Number, default: 0 },
    checkoutStarts: { type: Number, default: 0 },
    orders: { type: Number, default: 0 },
    revenue: { type: Number, default: 0 },
    bySource: {
      type: [
        new Schema(
          {
            source: { type: String, required: true },
            medium: { type: String },
            campaign: { type: String },
            sessions: { type: Number, default: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export type DailyStatDoc = InferSchemaType<typeof dailyStatSchema>;
export const DailyStat =
  (mongoose.models.DailyStat as mongoose.Model<DailyStatDoc>) ??
  mongoose.model('DailyStat', dailyStatSchema);
```

```ts
// apps/api/src/modules/analytics/rollup.ts
import { Event } from '../../models/Event';
import { Session } from '../../models/Session';
import { Order } from '../../models/Order';
import { DailyStat } from '../../models/DailyStat';

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dayBounds(key: string): { start: Date; end: Date } {
  const start = new Date(`${key}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

/** Where a visit came from when it carries no campaign tags. */
export function bucketSource(s: { utm?: { source?: string | null } | null; referrer?: string | null }): string {
  if (s.utm?.source) return s.utm.source;
  if (s.referrer) {
    try {
      // A referrer without utm still tells us something — bucketing it as
      // "direct" would hide organic search and social entirely.
      return new URL(s.referrer).hostname.replace(/^www\./, '');
    } catch {
      /* unparseable referrer */
    }
  }
  return 'direct';
}

/**
 * Recomputes one day from raw data and upserts it. Idempotent by construction:
 * every field is $set from a fresh computation, never incremented.
 */
export async function rollupDay(key: string): Promise<void> {
  const { start, end } = dayBounds(key);
  const window = { $gte: start, $lt: end };

  const sessions = await Session.find({ createdAt: window, isBot: { $ne: true } })
    .select('sessionId visitorId utm referrer')
    .lean();
  const humanIds = sessions.map((s) => s.sessionId);

  const counts = await Event.aggregate<{ _id: string; n: number }>([
    { $match: { createdAt: window, sessionId: { $in: humanIds } } },
    { $group: { _id: '$type', n: { $sum: 1 } } },
  ]);
  const byType = new Map(counts.map((c) => [c._id, c.n]));

  // Money comes from Order — authoritative, and unaffected by ad blockers.
  const [money] = await Order.aggregate<{ n: number; rev: number }>([
    { $match: { createdAt: window, status: { $ne: 'cancelled' } } },
    { $group: { _id: null, n: { $sum: 1 }, rev: { $sum: '$total' } } },
  ]);

  const sourceMap = new Map<string, { source: string; medium?: string; campaign?: string; sessions: number }>();
  for (const s of sessions) {
    const source = bucketSource(s);
    const medium = s.utm?.medium ?? undefined;
    const campaign = s.utm?.campaign ?? undefined;
    const k = `${source}|${medium ?? ''}|${campaign ?? ''}`;
    const row = sourceMap.get(k) ?? { source, medium, campaign, sessions: 0 };
    row.sessions += 1;
    sourceMap.set(k, row);
  }

  await DailyStat.updateOne(
    { date: key },
    {
      $set: {
        sessions: sessions.length,
        visitors: new Set(sessions.map((s) => s.visitorId)).size,
        productViews: byType.get('product_view') ?? 0,
        addToCarts: byType.get('add_to_cart') ?? 0,
        checkoutStarts: byType.get('checkout_started') ?? 0,
        orders: money?.n ?? 0,
        revenue: Math.round((money?.rev ?? 0) * 100) / 100,
        bySource: [...sourceMap.values()],
      },
    },
    { upsert: true },
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace apps/api -- analytics/rollup`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/models/DailyStat.ts apps/api/src/modules/analytics/rollup.ts apps/api/src/modules/analytics/rollup.test.ts
git commit -m "feat(analytics): DailyStat model and idempotent per-day rollup"
```

---

### Task 2: Lazy backfill (no cron)

**Files:**
- Modify: `apps/api/src/modules/analytics/rollup.ts` (add `ensureRollups`)
- Modify: `apps/api/src/modules/analytics/rollup.test.ts` (add the cases below)

**Interfaces:**
- Consumes: `rollupDay`, `dayKey` (Task 1).
- Produces: `ensureRollups(from: string, to: string): Promise<void>` — guarantees a stored row for every day in `[from, to]` that is strictly before today.

- [ ] **Step 1: Write the failing test**

```ts
// add to apps/api/src/modules/analytics/rollup.test.ts
import { ensureRollups } from './rollup';
import { vi } from 'vitest';

describe('ensureRollups', () => {
  it('fills every missing past day in the range', async () => {
    vi.setSystemTime(new Date('2026-08-13T12:00:00.000Z'));
    await ensureRollups('2026-08-10', '2026-08-12');
    const rows = await DailyStat.find({}).sort({ date: 1 }).lean();
    expect(rows.map((r) => r.date)).toEqual(['2026-08-10', '2026-08-11', '2026-08-12']);
    vi.useRealTimers();
  });

  it('never stores today — today is always computed live from raw events', async () => {
    vi.setSystemTime(new Date('2026-08-12T12:00:00.000Z'));
    await ensureRollups('2026-08-10', '2026-08-12');
    const rows = await DailyStat.find({}).lean();
    expect(rows.map((r) => r.date)).not.toContain('2026-08-12');
    vi.useRealTimers();
  });

  it('is cheap on a second call — existing days are not recomputed', async () => {
    vi.setSystemTime(new Date('2026-08-13T12:00:00.000Z'));
    await ensureRollups('2026-08-10', '2026-08-12');
    await DailyStat.updateOne({ date: '2026-08-10' }, { $set: { sessions: 999 } });
    await ensureRollups('2026-08-10', '2026-08-12');
    const d = await DailyStat.findOne({ date: '2026-08-10' }).lean();
    // Still 999: a stored day is trusted and left alone (self-healing only fills gaps).
    expect(d!.sessions).toBe(999);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- analytics/rollup`
Expected: FAIL — `ensureRollups` is not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
// append to apps/api/src/modules/analytics/rollup.ts

/**
 * Guarantees a stored rollup for every PAST day in the range.
 *
 * Deliberately lazy instead of scheduled (decision #54 — this project runs no
 * unattended jobs): a gap fills itself the next time anyone opens the dashboard,
 * there is no deploy configuration, and a failure cannot go unnoticed the way a
 * broken cron would. Today is never stored — it is still changing, so the endpoint
 * computes it live.
 */
export async function ensureRollups(from: string, to: string): Promise<void> {
  const today = dayKey(new Date());
  const wanted: string[] = [];
  for (let d = new Date(`${from}T00:00:00.000Z`); dayKey(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = dayKey(d);
    if (key < today) wanted.push(key);
  }
  if (wanted.length === 0) return;

  const existing = await DailyStat.find({ date: { $in: wanted } }).select('date').lean();
  const have = new Set(existing.map((r) => r.date));
  for (const key of wanted) {
    if (!have.has(key)) await rollupDay(key);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace apps/api -- analytics/rollup`
Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/analytics/rollup.ts apps/api/src/modules/analytics/rollup.test.ts
git commit -m "feat(analytics): lazy rollup backfill, no cron"
```

---

### Task 3: Cohorts and LTV, keyed on phone

**Files:**
- Create: `apps/api/src/modules/analytics/cohorts.ts`
- Create: `apps/api/src/modules/analytics/cohorts.test.ts`

**Interfaces:**
- Consumes: `Order`.
- Produces: `computeCohorts(start: Date, end: Date): Promise<AnalyticsCohortsDTO>`.

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/modules/analytics/cohorts.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectMemory, disconnectMemory, clearDb } from '../../test/db';
import { Order } from '../../models/Order';
import { computeCohorts } from './cohorts';

beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);

const START = new Date('2026-08-01T00:00:00.000Z');
const END = new Date('2026-08-31T23:59:59.999Z');

async function order(phone: string, total: number, iso: string, over: Record<string, unknown> = {}) {
  return Order.create({
    orderNumber: `HRC-${Math.random().toString(36).slice(2, 8)}`,
    items: [{ product: undefined, name: 'X', sizeLabel: '55ml', unitPrice: total, qty: 1 }],
    customer: { name: 'C', phone },
    shippingAddress: { line1: 'a', city: 'Cairo', governorate: 'Cairo', phone },
    subtotal: total, shipping: 0, total, status: 'confirmed',
    createdAt: new Date(iso), ...over,
  });
}

describe('computeCohorts', () => {
  it('counts a first-time buyer as new', async () => {
    await order('01012345678', 500, '2026-08-05T10:00:00.000Z');
    const c = await computeCohorts(START, END);
    expect(c.newCustomers).toBe(1);
    expect(c.returningCustomers).toBe(0);
  });

  it('counts someone with an earlier order as returning', async () => {
    await order('01012345678', 500, '2026-07-01T10:00:00.000Z');
    await order('01012345678', 700, '2026-08-05T10:00:00.000Z');
    const c = await computeCohorts(START, END);
    expect(c.newCustomers).toBe(0);
    expect(c.returningCustomers).toBe(1);
  });

  it('treats differently formatted numbers as one customer', async () => {
    // The order schema normalises on write, so both land as 01012345678 — this
    // test locks in that cohorts rely on that normalisation.
    await order('01012345678', 500, '2026-08-05T10:00:00.000Z');
    await order('+201012345678', 700, '2026-08-06T10:00:00.000Z');
    const c = await computeCohorts(START, END);
    expect(c.newCustomers + c.returningCustomers).toBe(1);
  });

  it('reports repeat rate and average lifetime value', async () => {
    await order('01012345678', 500, '2026-08-01T10:00:00.000Z');
    await order('01012345678', 500, '2026-08-09T10:00:00.000Z');
    await order('01099999999', 1000, '2026-08-10T10:00:00.000Z');
    const c = await computeCohorts(START, END);
    expect(c.repeatRate).toBeCloseTo(0.5, 5); // 1 of 2 customers ordered twice
    expect(c.avgLtv).toBeCloseTo(1000, 5); // (1000 + 1000) / 2
  });

  it('ignores cancelled orders', async () => {
    await order('01012345678', 500, '2026-08-05T10:00:00.000Z', { status: 'cancelled' });
    const c = await computeCohorts(START, END);
    expect(c.newCustomers).toBe(0);
    expect(c.avgLtv).toBe(0);
  });

  it('returns zeros rather than NaN when there are no orders', async () => {
    const c = await computeCohorts(START, END);
    expect(c).toMatchObject({ newCustomers: 0, returningCustomers: 0, repeatRate: 0, avgLtv: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- analytics/cohorts`
Expected: FAIL — cannot resolve `./cohorts`.

- [ ] **Step 3: Write minimal implementation**

```ts
// apps/api/src/modules/analytics/cohorts.ts
import type { AnalyticsCohortsDTO } from '@herencia/shared';
import { Order } from '../../models/Order';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Cohorts keyed on the customer phone number.
 *
 * Guest checkout is the norm here, so an account-based definition would measure a
 * small and unrepresentative slice. `createOrderSchema` already normalises phones on
 * write (decision #44), so equality is enough — no normalisation is repeated here.
 *
 * "New" means the customer's earliest non-cancelled order falls inside the range.
 */
export async function computeCohorts(start: Date, end: Date): Promise<AnalyticsCohortsDTO> {
  const notCancelled = { status: { $ne: 'cancelled' } };

  const rows = await Order.aggregate<{
    _id: string;
    firstOrderAt: Date;
    inRangeCount: number;
    inRangeRevenue: number;
    lifetimeRevenue: number;
    lifetimeCount: number;
  }>([
    { $match: notCancelled },
    {
      $group: {
        _id: '$customer.phone',
        firstOrderAt: { $min: '$createdAt' },
        lifetimeRevenue: { $sum: '$total' },
        lifetimeCount: { $sum: 1 },
        inRangeCount: {
          $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', start] }, { $lte: ['$createdAt', end] }] }, 1, 0] },
        },
        inRangeRevenue: {
          $sum: { $cond: [{ $and: [{ $gte: ['$createdAt', start] }, { $lte: ['$createdAt', end] }] }, '$total', 0] },
        },
      },
    },
    { $match: { inRangeCount: { $gt: 0 } } },
  ]);

  if (rows.length === 0) {
    return {
      newCustomers: 0, returningCustomers: 0, repeatRate: 0,
      avgLtv: 0, firstOrderRevenue: 0, repeatOrderRevenue: 0,
    };
  }

  let newCustomers = 0;
  let returningCustomers = 0;
  let firstOrderRevenue = 0;
  let repeatOrderRevenue = 0;
  let repeatBuyers = 0;
  let lifetimeTotal = 0;

  for (const r of rows) {
    const isNew = r.firstOrderAt >= start && r.firstOrderAt <= end;
    if (isNew) {
      newCustomers += 1;
      firstOrderRevenue += r.inRangeRevenue;
    } else {
      returningCustomers += 1;
      repeatOrderRevenue += r.inRangeRevenue;
    }
    if (r.lifetimeCount > 1) repeatBuyers += 1;
    lifetimeTotal += r.lifetimeRevenue;
  }

  return {
    newCustomers,
    returningCustomers,
    repeatRate: round2(repeatBuyers / rows.length),
    avgLtv: round2(lifetimeTotal / rows.length),
    firstOrderRevenue: round2(firstOrderRevenue),
    repeatOrderRevenue: round2(repeatOrderRevenue),
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace apps/api -- analytics/cohorts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/modules/analytics/cohorts.ts apps/api/src/modules/analytics/cohorts.test.ts
git commit -m "feat(analytics): phone-keyed cohorts and lifetime value"
```

---

### Task 4: `GET /api/admin/analytics`

**Files:**
- Modify: `packages/shared/src/schemas/adminExtras.ts` (add the DTOs below)
- Create: `apps/api/src/modules/analytics/report.ts`
- Modify: `apps/api/src/routes/admin.ts` (register `GET /analytics`)
- Create: `apps/api/src/routes/adminAnalytics.test.ts`

**Interfaces:**
- Consumes: `ensureRollups`, `rollupDay`, `dayKey`, `bucketSource` (Tasks 1–2), `computeCohorts` (Task 3).
- Produces: `buildReport(from: string, to: string): Promise<AnalyticsDTO>` and the endpoint.

DTOs to add to `packages/shared/src/schemas/adminExtras.ts`:

```ts
export type AnalyticsFunnelDTO = {
  sessions: number;
  productViews: number;
  addToCarts: number;
  checkoutStarts: number;
  orders: number;
};
export type AnalyticsPointDTO = { date: string; sessions: number; orders: number; revenue: number };
export type AnalyticsSourceDTO = {
  source: string;
  medium?: string;
  campaign?: string;
  sessions: number;
  orders: number;
  revenue: number;
  /** orders ÷ sessions; 0 when there were no sessions. */
  conversion: number;
};
export type AnalyticsCohortsDTO = {
  newCustomers: number;
  returningCustomers: number;
  repeatRate: number;
  avgLtv: number;
  firstOrderRevenue: number;
  repeatOrderRevenue: number;
};
export type AnalyticsDTO = {
  range: { from: string; to: string };
  funnel: AnalyticsFunnelDTO;
  previous: AnalyticsFunnelDTO;
  series: AnalyticsPointDTO[];
  revenue: number;
  previousRevenue: number;
  aov: number;
  sources: AnalyticsSourceDTO[];
  cohorts: AnalyticsCohortsDTO;
};
```

- [ ] **Step 1: Write the failing test**

```ts
// apps/api/src/routes/adminAnalytics.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi, afterEach } from 'vitest';
import request from 'supertest';
import { connectMemory, disconnectMemory, clearDb } from '../test/db';
import { createApp } from '../app';
import { authCookie } from '../test/auth';
import { User } from '../models/User';
import { Session } from '../models/Session';
import { Event } from '../models/Event';
import { Order } from '../models/Order';

const app = createApp({ clientOrigin: 'http://localhost:5173' });
beforeAll(connectMemory);
afterAll(disconnectMemory);
beforeEach(clearDb);
afterEach(() => vi.useRealTimers());

async function admin() {
  const u = await User.create({ name: 'A', email: 'a@h.example', passwordHash: 'x', role: 'admin' });
  return authCookie(String(u._id), 'admin');
}
async function seedDay(iso: string) {
  await Session.create({
    sessionId: `s-${iso}`, visitorId: `v-${iso}`, landingPath: '/', isBot: false,
    utm: { source: 'instagram', medium: 'social', campaign: 'launch' },
    createdAt: new Date(iso), startedAt: new Date(iso), lastSeenAt: new Date(iso),
  });
  await Event.create({ type: 'product_view', sessionId: `s-${iso}`, visitorId: `v-${iso}`, path: '/', createdAt: new Date(iso) });
  await Order.create({
    orderNumber: `HRC-${iso.slice(8, 10)}${Math.random().toString(36).slice(2, 6)}`,
    items: [{ product: undefined, name: 'X', sizeLabel: '55ml', unitPrice: 500, qty: 1 }],
    customer: { name: 'C', phone: '01012345678' },
    shippingAddress: { line1: 'a', city: 'Cairo', governorate: 'Cairo', phone: '01012345678' },
    subtotal: 500, shipping: 60, total: 560, status: 'confirmed',
    attribution: { source: 'instagram', medium: 'social', campaign: 'launch' },
    createdAt: new Date(iso),
  });
}

describe('GET /api/admin/analytics', () => {
  it('requires admin auth', async () => {
    await request(app).get('/api/admin/analytics').expect(401);
  });

  it('returns the funnel, series, sources and cohorts for a range', async () => {
    vi.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
    const cookie = await admin();
    await seedDay('2026-08-10T10:00:00.000Z');
    await seedDay('2026-08-11T10:00:00.000Z');

    const res = await request(app)
      .get('/api/admin/analytics?from=2026-08-10&to=2026-08-11')
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.funnel).toMatchObject({ sessions: 2, productViews: 2, orders: 2 });
    expect(res.body.revenue).toBe(1120);
    expect(res.body.aov).toBe(560);
    expect(res.body.series).toHaveLength(2);
    expect(res.body.series[0]).toMatchObject({ date: '2026-08-10', orders: 1, revenue: 560 });
    const ig = res.body.sources.find((s: { source: string }) => s.source === 'instagram');
    expect(ig).toMatchObject({ sessions: 2, orders: 2, revenue: 1120 });
    expect(ig.conversion).toBe(1);
  });

  it('compares against the immediately preceding period of equal length', async () => {
    vi.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
    const cookie = await admin();
    await seedDay('2026-08-08T10:00:00.000Z'); // previous period
    await seedDay('2026-08-10T10:00:00.000Z'); // current period

    const res = await request(app)
      .get('/api/admin/analytics?from=2026-08-10&to=2026-08-11')
      .set('Cookie', cookie)
      .expect(200);

    expect(res.body.funnel.orders).toBe(1);
    expect(res.body.previous.orders).toBe(1);
    expect(res.body.previousRevenue).toBe(560);
  });

  it('returns zeros, not NaN, for a range with no data', async () => {
    vi.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
    const cookie = await admin();
    const res = await request(app)
      .get('/api/admin/analytics?from=2026-08-01&to=2026-08-02')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.funnel).toMatchObject({ sessions: 0, orders: 0 });
    expect(res.body.aov).toBe(0);
    expect(res.body.cohorts.repeatRate).toBe(0);
  });

  it('rejects a malformed date range', async () => {
    const cookie = await admin();
    await request(app).get('/api/admin/analytics?from=nonsense&to=2026-08-11').set('Cookie', cookie).expect(400);
  });

  it('includes today, computed live rather than from a stored rollup', async () => {
    vi.setSystemTime(new Date('2026-08-14T12:00:00.000Z'));
    const cookie = await admin();
    await seedDay('2026-08-14T09:00:00.000Z');
    const res = await request(app)
      .get('/api/admin/analytics?from=2026-08-14&to=2026-08-14')
      .set('Cookie', cookie)
      .expect(200);
    expect(res.body.funnel.orders).toBe(1);
    expect(res.body.series[0]).toMatchObject({ date: '2026-08-14', orders: 1 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/api -- adminAnalytics`
Expected: FAIL — 404 on the route.

- [ ] **Step 3: Write minimal implementation**

Create `apps/api/src/modules/analytics/report.ts` with `buildReport(from, to)` that:
1. calls `ensureRollups(from, to)`;
2. loads stored `DailyStat` rows for the range, and if `to >= today` computes today's row live by calling `rollupDay(today)` into a throwaway read (simplest correct approach: call `rollupDay(today)` then read it back — it is idempotent and today's row is rewritten on every dashboard load, which is exactly the desired "always fresh" behaviour);
3. sums the rows into `funnel`, `series`, `revenue`;
4. repeats steps 1–3 for the preceding period of equal length to fill `previous` / `previousRevenue`;
5. merges `bySource` session counts with `Order.attribution` order/revenue counts keyed on `source|medium|campaign`, computing `conversion = sessions ? orders / sessions : 0`;
6. calls `computeCohorts(start, end)`.

Register in `apps/api/src/routes/admin.ts` alongside `/stats`:

```ts
  router.get('/analytics', async (req, res, next) => {
    try {
      const range = z
        .object({ from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
        .safeParse({ from: req.query.from ?? dayKey(new Date(Date.now() - 29 * 864e5)), to: req.query.to ?? dayKey(new Date()) });
      if (!range.success) throw new HttpError(400, 'Invalid date range', 'invalid_range');
      res.json(await buildReport(range.data.from, range.data.to));
    } catch (err) {
      next(err);
    }
  });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace apps/api -- adminAnalytics`
Expected: PASS (6 tests). Then run the whole api suite to confirm no regression.

- [ ] **Step 5: Commit**

```bash
git add packages/shared/src/schemas/adminExtras.ts apps/api/src/modules/analytics/report.ts apps/api/src/routes/admin.ts apps/api/src/routes/adminAnalytics.test.ts
git commit -m "feat(analytics): admin analytics report endpoint"
```

---

### Task 5: `/admin/analytics` page

**Files:**
- Create: `apps/web/src/components/charts/LineChart.tsx`
- Create: `apps/web/src/components/charts/LineChart.test.tsx`
- Create: `apps/web/src/pages/admin/AdminAnalytics.tsx`
- Create: `apps/web/src/pages/admin/AdminAnalytics.test.tsx`
- Modify: `apps/web/src/features/admin/adminClient.ts` (add `adminFetchAnalytics`)
- Modify: `apps/web/src/pages/admin/AdminApp.tsx` (route + nav link)

**Interfaces:**
- Consumes: `AnalyticsDTO` (Task 4).
- Produces: the page. Nothing downstream.

**Design notes (follow the `dataviz` skill):**
- Funnel: five horizontal bars, each labelled with its absolute count and the drop-off percentage from the previous step. Bar width is proportional to the top of the funnel, so the shape reads at a glance.
- Revenue: a single-series SVG line chart with the previous period as a muted second line. No gridlines beyond a baseline; label only first/last/max.
- Sources and cohorts: plain tables — they are lookup data, and a chart would add nothing.
- Every panel needs an explicit empty state ("No visits recorded yet"), because a brand-new store starts with zero of everything and a blank chart looks broken.
- Use existing brand tokens (`text-content`, `text-muted`, `bg-surface2`, `border-hairline`, `text-accent`). Respect `prefers-reduced-motion` — no entry animation on the chart.

- [ ] **Step 1: Write the failing test**

```tsx
// apps/web/src/components/charts/LineChart.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LineChart } from './LineChart';

describe('LineChart', () => {
  it('renders a path with one point per datum', () => {
    const { container } = render(
      <LineChart points={[{ x: '2026-08-10', y: 10 }, { x: '2026-08-11', y: 20 }]} label="Revenue" />,
    );
    const path = container.querySelector('path[data-series="main"]');
    expect(path).toBeTruthy();
    expect(path!.getAttribute('d')!.match(/L|M/g)!.length).toBe(2);
  });

  it('shows an empty state rather than an empty chart', () => {
    render(<LineChart points={[]} label="Revenue" />);
    expect(screen.getByText(/no data/i)).toBeInTheDocument();
  });

  it('does not divide by zero when every value is identical', () => {
    const { container } = render(
      <LineChart points={[{ x: 'a', y: 5 }, { x: 'b', y: 5 }]} label="Flat" />,
    );
    const d = container.querySelector('path[data-series="main"]')!.getAttribute('d')!;
    expect(d).not.toContain('NaN');
  });
});
```

```tsx
// apps/web/src/pages/admin/AdminAnalytics.test.tsx — mock adminFetchAnalytics and assert
// the funnel numbers, drop-off percentages, the sources table and the empty state render.
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test --workspace apps/web -- charts/LineChart`
Expected: FAIL — cannot resolve `./LineChart`.

- [ ] **Step 3: Write the chart, then the page**

`LineChart` takes `{ points: { x: string; y: number }[]; label: string; comparison?: { x: string; y: number }[] }`, computes a viewBox from the data, and returns inline SVG. Guard the y-scale: when `max === min`, use a denominator of 1 so the path is a flat line rather than `NaN`.

`AdminAnalytics` queries `adminFetchAnalytics({ from, to })` via React Query, renders a range selector (7 / 30 / 90 days), the funnel, the revenue chart with comparison, the sources table and the cohorts panel.

Add to `adminClient.ts`:

```ts
export const adminFetchAnalytics = (range: { from: string; to: string }) =>
  apiGet<AnalyticsDTO>(`/api/admin/analytics?from=${range.from}&to=${range.to}`);
```

Add to `AdminApp.tsx`: `<Route path="/analytics" element={<AdminAnalytics />} />` plus a nav link next to Dashboard.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test --workspace apps/web`
Expected: PASS, including the new chart and page tests.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/charts apps/web/src/pages/admin/AdminAnalytics.tsx apps/web/src/pages/admin/AdminAnalytics.test.tsx apps/web/src/features/admin/adminClient.ts apps/web/src/pages/admin/AdminApp.tsx
git commit -m "feat(analytics): admin analytics dashboard"
```

---

## Final verification

- [ ] `npm run typecheck` and `npm run lint` — clean
- [ ] All three suites green
- [ ] `npm run build` — clean
- [ ] **Deploy api before web** (decision #59)
- [ ] Open `/admin/analytics` on production and confirm every panel renders with real (or empty-state) data — Phase 1's live bugs were all things unit tests passed through.
