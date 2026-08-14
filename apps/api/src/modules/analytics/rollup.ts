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

/**
 * Recomputes one day from raw data and upserts it.
 *
 * Idempotent by construction: every field is `$set` from a fresh computation, never
 * incremented — so re-running a day (which the endpoint does for *today* on every
 * dashboard load) can never double-count.
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

  // Money comes from Order — authoritative, and unaffected by ad blockers that can
  // silently drop the browser's purchase event.
  const [money] = await Order.aggregate<{ n: number; rev: number }>([
    { $match: { createdAt: window, status: { $ne: 'cancelled' } } },
    { $group: { _id: null, n: { $sum: 1 }, rev: { $sum: '$total' } } },
  ]);

  const sourceMap = new Map<
    string,
    { source: string; medium?: string; campaign?: string; sessions: number }
  >();
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
  for (const key of wanted) {
    if (!have.has(key)) await rollupDay(key);
  }
}
