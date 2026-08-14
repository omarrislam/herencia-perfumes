import { Event } from '../../models/Event';
import { Session } from '../../models/Session';
import { Order } from '../../models/Order';
import { DailyStat } from '../../models/DailyStat';

export function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function dayBounds(key: string): { start: Date; end: Date } {
  const start = new Date(`${key}T00:00:00.000Z`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}

/** Where a visit came from when it carries no campaign tags. */
export function bucketSource(s: {
  utm?: { source?: string | null } | null;
  referrer?: string | null;
}): string {
  if (s.utm?.source) return s.utm.source;
  if (s.referrer) {
    try {
      // A referrer without utm still tells us something — bucketing it as "direct"
      // would hide organic search and untagged social traffic entirely.
      return new URL(s.referrer).hostname.replace(/^www\./, '');
    } catch {
      /* unparseable referrer — fall through to direct */
    }
  }
  return 'direct';
}

const UTC_DAY = { format: '%Y-%m-%d', timezone: 'UTC' } as const;

type SourceRow = { source: string; medium?: string; campaign?: string; sessions: number };

/**
 * Recomputes the given days from raw data and upserts them all.
 *
 * Deliberately range-based rather than a loop over single days: a per-day loop ran
 * three queries per day, which made the first 90-day dashboard load take 23s while
 * it backfilled. This runs three grouped aggregations for the WHOLE span regardless
 * of how many days are missing.
 *
 * Idempotent by construction: every field is `$set` from a fresh computation, never
 * incremented — so re-running a day (which the report does for *today* on every
 * dashboard load) can never double-count.
 */
export async function rollupRange(keys: string[]): Promise<void> {
  if (keys.length === 0) return;
  const sorted = [...keys].sort();
  const start = dayBounds(sorted[0]!).start;
  const end = dayBounds(sorted[sorted.length - 1]!).end;
  const window = { $gte: start, $lt: end };

  const sessions = await Session.aggregate<{
    day: string;
    sessionId: string;
    visitorId: string;
    utm?: { source?: string; medium?: string; campaign?: string };
    referrer?: string;
  }>([
    { $match: { createdAt: window, isBot: { $ne: true } } },
    {
      $project: {
        _id: 0,
        day: { $dateToString: { ...UTC_DAY, date: '$createdAt' } },
        sessionId: 1,
        visitorId: 1,
        utm: 1,
        referrer: 1,
      },
    },
  ]);

  const humanIds = sessions.map((s) => s.sessionId);
  const events = await Event.aggregate<{ _id: { day: string; type: string }; n: number }>([
    { $match: { createdAt: window, sessionId: { $in: humanIds } } },
    {
      $group: {
        _id: { day: { $dateToString: { ...UTC_DAY, date: '$createdAt' } }, type: '$type' },
        n: { $sum: 1 },
      },
    },
  ]);

  // Money comes from Order — authoritative, and unaffected by ad blockers that can
  // silently drop the browser's purchase event.
  const money = await Order.aggregate<{ _id: string; n: number; rev: number }>([
    { $match: { createdAt: window, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: { $dateToString: { ...UTC_DAY, date: '$createdAt' } },
        n: { $sum: 1 },
        rev: { $sum: '$total' },
      },
    },
  ]);

  const sessionsByDay = new Map<string, typeof sessions>();
  for (const s of sessions) {
    const list = sessionsByDay.get(s.day) ?? [];
    list.push(s);
    sessionsByDay.set(s.day, list);
  }
  const eventsByDay = new Map<string, Map<string, number>>();
  for (const e of events) {
    const m = eventsByDay.get(e._id.day) ?? new Map<string, number>();
    m.set(e._id.type, e.n);
    eventsByDay.set(e._id.day, m);
  }
  const moneyByDay = new Map(money.map((m) => [m._id, m]));

  // Only the requested keys are written — days that fall inside the span but are
  // already stored must not be silently recomputed.
  type BulkOps = Parameters<typeof DailyStat.bulkWrite>[0];
  const ops: BulkOps = keys.map((key) => {
    const daySessions = sessionsByDay.get(key) ?? [];
    const byType = eventsByDay.get(key) ?? new Map<string, number>();
    const cash = moneyByDay.get(key);

    const sourceMap = new Map<string, SourceRow>();
    for (const s of daySessions) {
      const source = bucketSource(s);
      const medium = s.utm?.medium ?? undefined;
      const campaign = s.utm?.campaign ?? undefined;
      const k = `${source}|${medium ?? ''}|${campaign ?? ''}`;
      const row = sourceMap.get(k) ?? { source, medium, campaign, sessions: 0 };
      row.sessions += 1;
      sourceMap.set(k, row);
    }

    return {
      updateOne: {
        filter: { date: key },
        update: {
          $set: {
            sessions: daySessions.length,
            visitors: new Set(daySessions.map((s) => s.visitorId)).size,
            productViews: byType.get('product_view') ?? 0,
            addToCarts: byType.get('add_to_cart') ?? 0,
            checkoutStarts: byType.get('checkout_started') ?? 0,
            orders: cash?.n ?? 0,
            revenue: Math.round((cash?.rev ?? 0) * 100) / 100,
            bySource: [...sourceMap.values()],
          },
        },
        upsert: true,
      },
    };
  });

  await DailyStat.bulkWrite(ops, { ordered: false });
}

/** Convenience wrapper — the report recomputes today on every load. */
export async function rollupDay(key: string): Promise<void> {
  return rollupRange([key]);
}

/**
 * Guarantees a stored rollup for every PAST day in the range.
 *
 * Deliberately lazy rather than scheduled (decision #54 — this project runs no
 * unattended jobs): a gap fills itself the next time anyone opens the dashboard,
 * there is no deploy configuration to get wrong, and it cannot fail silently the
 * way a broken cron would. Today is never stored — it is still changing, so the
 * report computes it live.
 */
export async function ensureRollups(from: string, to: string): Promise<void> {
  const today = dayKey(new Date());
  const wanted: string[] = [];
  for (const d = new Date(`${from}T00:00:00.000Z`); dayKey(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    const key = dayKey(d);
    if (key < today) wanted.push(key);
  }
  if (wanted.length === 0) return;

  const existing = await DailyStat.find({ date: { $in: wanted } })
    .select('date')
    .lean();
  const have = new Set(existing.map((r) => r.date));
  // One batched pass, not one round trip per day — see rollupRange.
  await rollupRange(wanted.filter((key) => !have.has(key)));
}
