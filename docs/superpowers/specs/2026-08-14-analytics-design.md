# HERENCIA — First-party analytics

_Design spec · 2026-08-14 · supersedes nothing_

## Problem

The admin dashboard is entirely order-derived: revenue, order counts, best sellers, stock
levels. There is **no visitor-side data at all**. Every question the owner actually wants
answered — where do people drop off, which campaign made money, do customers come back —
needs session data the app has never collected.

The store is about to launch. Uncollected traffic is unrecoverable, so capture is
time-critical in a way the reporting UI is not.

## Decisions taken (user, 2026-08-14)

| Question | Choice |
|---|---|
| Build vs buy | **Full first-party.** Order data already lives in our DB; splitting analytics across two systems would make "did Instagram sell anything" a two-screen question. |
| Customer identity | **Phone number.** Guest checkout is the norm and every order carries a validated Egyptian phone. Consistent with `linkGuestOrders` (#55) and one-per-phone discounts (#52). |
| Retention | **90 days raw + permanent rollups.** Bounded storage on Atlas M0 (512 MB); long-range trends survive in rollups. |
| Phasing | **Capture ships before the dashboard.** |

## Constraints

- **Atlas M0, 512 MB.** Currently 0.43 MB / 20 objects. Events are the only unbounded
  collection in the system — TTL is not optional.
- **Lighthouse ≥ 90 mobile** (CLAUDE.md). The tracker must be tiny and must never block
  navigation. Admin code is lazy-loaded and outside the storefront budget.
- **Never trust the client with money** (decision #22).
- **No unattended jobs** (decision #54).
- Vercel serverless: rate limiters are per-instance MemoryStore, so limits are advisory.

## Phase 1 — Capture

### Data model

**`Event`** — one row per tracked interaction.

```
type       'page_view' | 'product_view' | 'add_to_cart' | 'checkout_started' | 'purchase'
sessionId  string, indexed
visitorId  string, indexed
path       string
product    ObjectId?      (product_view, add_to_cart)
value      number?        (EGP; SERVER-DERIVED, never client-supplied)
orderNumber string?       (purchase)
createdAt  Date           TTL index, expires after 90 days
```

**`Session`** — one row per visit. UTMs live here, not repeated on every event.

```
sessionId    string, unique
visitorId    string, indexed
utm          { source?, medium?, campaign?, content?, term? }
referrer     string
landingPath  string
device       'mobile' | 'desktop'
isBot        boolean, indexed
startedAt    Date
lastSeenAt   Date
createdAt    Date          TTL index, expires after 90 days
```

**`Order.attribution`** — new embedded field, **the load-bearing piece**.

```
attribution { source?, medium?, campaign?, referrer?, landingPath?, sessionId? }
```

Stamped at order creation from the visitor's session. Because it lives on the order, it
**outlives the 90-day TTL** — revenue attribution stays correct forever, while raw
session detail expires. Absent on orders placed before this ships; all reads treat a
missing attribution as `direct`.

### Sessionisation

- `visitorId` — random id, `localStorage`, persists across visits. First-party only, never
  shared with any third party.
- `sessionId` — random id, regenerated after **30 minutes of inactivity**.
- UTMs and referrer captured from the **first** page of a session and written to `Session`;
  later pages in the same session must not overwrite them (otherwise an internal
  navigation would erase the original campaign).
- The app is a SPA, so `page_view` fires **on route change**, not just initial load.

### Ingestion

`POST /api/events` — accepts a batch:

```
{ session: { sessionId, visitorId, utm?, referrer?, landingPath?, device },
  events: [{ type, path, productSlug?, sessionId, ... }] }
```

- Validated with a shared Zod schema (`packages/shared/src/schemas/analytics.ts`).
- Own rate limiter, generous — this runs for every visitor, not just writers.
- Session is upserted; `lastSeenAt` bumped. UTMs written only when absent.
- The client sends `productSlug`; the **server resolves it to the `product` ObjectId** and
  drops the event if no active product matches. The client never sends database ids.
- `device` is derived **server-side from the user-agent**, not sent by the client — the
  same request already parses the UA for bot detection.
- **`value` is never read from the request.** For `add_to_cart` the server looks the
  product price up from the DB. Mirrors decision #22.
- **Bot filtering at ingestion**: user-agent matched against a known-crawler pattern;
  matches set `Session.isBot` and are excluded from every downstream aggregate. Cheap,
  and keeps bot traffic out of the numbers rather than filtering at read time forever.
- Fail-soft: an ingestion error must never surface to the visitor.

Client transport is `navigator.sendBeacon` where available, falling back to
`fetch(..., { keepalive: true })`. Events are queued and flushed on route change and on
`visibilitychange`, so navigation is never blocked.

### The purchase event is server-side

`createOrder` writes the `purchase` event itself and stamps `attribution` onto the order.
The client only reports `checkout_started`. A client-reported purchase would be both
spoofable and lossy (users close the tab on the confirmation page).

### Testing (Phase 1)

- **shared** — event/session schema validation, including rejection of a client-supplied `value`.
- **api** — batch ingest; session upsert does not overwrite existing UTMs; bot UA sets
  `isBot`; `add_to_cart` value comes from the DB price and ignores any client value;
  `createOrder` stamps attribution and writes exactly one purchase event; ingestion failure
  never breaks a request; TTL indexes exist on both collections.
- **web** — session expires after 30 min idle; UTMs captured on landing only; route change
  emits `page_view`; queue flushes via sendBeacon and falls back correctly.

## Phase 2 — Dashboard

### Rollups without cron

**`DailyStat`** — one permanent doc per day (`date` unique, `YYYY-MM-DD`), holding
sessions, visitors, product views, add-to-carts, checkout starts, orders, revenue, plus
`bySource[]` and `byProduct[]` breakdowns.

Rollups are **lazy, not scheduled**: the stats endpoint computes and stores any missing
past day on request, and computes *today* live from raw events. Self-healing (a gap fills
itself on the next view), no deploy configuration, and no unattended job — consistent with
decision #54. Admin traffic is low enough that the cost is irrelevant.

Rollup writes must be **idempotent** — recomputing a day overwrites rather than accumulates.

### `/admin/analytics`

The existing `/admin` dashboard stays as the operational view (fulfilment, stock). The new
page carries the reporting, with a date range (7 / 30 / 90 / custom) and compare-to-previous:

1. **Funnel** — sessions → product views → add to cart → checkout started → orders, with
   absolute counts and drop-off % between each step.
2. **Revenue over time** — line chart for the range against the previous period, plus AOV.
3. **Traffic sources** — table by source / medium / campaign: sessions, orders,
   conversion % (`orders ÷ sessions`), revenue. **Sessions come from `DailyStat.bySource`
   and orders/revenue from `Order.attribution`** — so the whole table survives past the
   90-day raw TTL, not just the money columns. A session with no UTM is bucketed as
   `direct`; one with a referrer but no UTM is bucketed by referrer host.
4. **Cohorts & LTV** — keyed on normalised phone (reusing `egyptianPhoneSchema`'s
   normalisation so `+20…`, `0…` and spaced forms collapse to one customer). A **new**
   customer is one whose earliest non-cancelled order falls in the selected range;
   **returning** is anyone with a prior one. Reports repeat purchase rate, average LTV,
   and revenue split between first and repeat orders. Cancelled orders are excluded
   throughout, matching the existing `/api/admin/stats` convention.

### Charts

Hand-rolled SVG — a line chart and bar/funnel shapes are simple, and a charting library
(~100 KB) fights the Lighthouse budget for no real gain. Visual design follows the
`dataviz` skill. If hand-rolling proves genuinely painful, raise it rather than silently
adding a dependency.

### Testing (Phase 2)

Rollup arithmetic against a known event fixture; idempotent recomputation; backfill of a
gap; bot sessions excluded; funnel percentages with a zero denominator; period comparison
across a month boundary; cohort matching on differently-formatted phone numbers for the
same person; rendering of each panel including the empty state.

## Explicitly out of scope

Heatmaps, session replay, real-time visitors, A/B testing, and email/marketing automation.
None were requested; each is its own subsystem.

## Risks

| Risk | Mitigation |
|---|---|
| Event volume fills Atlas M0 | 90-day TTL on both raw collections; permanent data is only the small per-day rollup. Monitor `dataSize` after the first busy week. |
| Ad blockers drop `/api/events` | Same-origin first-party path, no third-party script, so most blockers pass it. Purchases and revenue are server-side regardless, so **money data is never affected** — only top-of-funnel is undercounted. |
| Bot traffic inflates sessions | UA filter at ingestion + `isBot` excluded from aggregates. |
| Rollup drift after a code change | Rollups are recomputable from raw events within the 90-day window; recomputation is idempotent. |
| Serverless rate limiter is per-instance | Accepted, pre-existing (round 37). Ingestion is cheap and validated; abuse would cost storage, bounded by TTL. |

## Open question for later

Ad blockers and the 90-day window mean top-of-funnel counts are directional, not exact.
That is fine for trend and comparison, which is what the reports are for. If exact
pageview counts are ever needed, that is a different tool and a different conversation.
