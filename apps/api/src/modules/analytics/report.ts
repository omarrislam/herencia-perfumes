import type {
  AnalyticsDTO,
  AnalyticsFunnelDTO,
  AnalyticsPointDTO,
  AnalyticsSourceDTO,
} from '@herencia/shared';
import { DailyStat, type DailyStatDoc } from '../../models/DailyStat';
import { Order } from '../../models/Order';
import { ensureRollups, rollupDay, dayKey, dayBounds } from './rollup';
import { computeCohorts } from './cohorts';

const round2 = (n: number) => Math.round(n * 100) / 100;

function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (const d = new Date(`${from}T00:00:00.000Z`); dayKey(d) <= to; d.setUTCDate(d.getUTCDate() + 1)) {
    days.push(dayKey(d));
  }
  return days;
}

function shiftDays(key: string, delta: number): string {
  const d = new Date(`${key}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return dayKey(d);
}

/**
 * Stored rollups for the range, plus a freshly computed row for today.
 *
 * Today is deliberately recomputed on every call rather than cached: it is still
 * changing, and `rollupDay` is idempotent so rewriting it is safe and keeps the
 * dashboard live.
 */
async function rowsFor(from: string, to: string): Promise<DailyStatDoc[]> {
  await ensureRollups(from, to);
  const today = dayKey(new Date());
  if (today >= from && today <= to) await rollupDay(today);
  return DailyStat.find({ date: { $gte: from, $lte: to } })
    .sort({ date: 1 })
    .lean();
}

function sumFunnel(rows: DailyStatDoc[]): AnalyticsFunnelDTO {
  return rows.reduce<AnalyticsFunnelDTO>(
    (acc, r) => ({
      sessions: acc.sessions + r.sessions,
      productViews: acc.productViews + r.productViews,
      addToCarts: acc.addToCarts + r.addToCarts,
      checkoutStarts: acc.checkoutStarts + r.checkoutStarts,
      orders: acc.orders + r.orders,
    }),
    { sessions: 0, productViews: 0, addToCarts: 0, checkoutStarts: 0, orders: 0 },
  );
}

// Accepts null as well as undefined: mongoose subdocuments type optional strings as
// `string | null | undefined`, and both must collapse to the same key.
const sourceKey = (s: { source: string; medium?: string | null; campaign?: string | null }) =>
  `${s.source}|${s.medium ?? ''}|${s.campaign ?? ''}`;

/**
 * Traffic sources: session counts come from the rollups, orders and revenue from
 * `Order.attribution`.
 *
 * Splitting them this way is what makes the table outlive the 90-day raw TTL — the
 * money half is stored permanently on the orders themselves.
 */
async function buildSources(rows: DailyStatDoc[], start: Date, end: Date): Promise<AnalyticsSourceDTO[]> {
  const merged = new Map<string, AnalyticsSourceDTO>();

  for (const row of rows) {
    for (const s of row.bySource) {
      const key = sourceKey(s);
      const existing = merged.get(key) ?? {
        source: s.source,
        medium: s.medium ?? undefined,
        campaign: s.campaign ?? undefined,
        sessions: 0,
        orders: 0,
        revenue: 0,
        conversion: 0,
      };
      existing.sessions += s.sessions;
      merged.set(key, existing);
    }
  }

  const attributed = await Order.aggregate<{
    _id: { source: string | null; medium: string | null; campaign: string | null };
    n: number;
    rev: number;
  }>([
    { $match: { createdAt: { $gte: start, $lte: end }, status: { $ne: 'cancelled' } } },
    {
      $group: {
        _id: {
          // Orders placed before analytics shipped have no attribution — they are
          // genuinely unknown, so they read as direct rather than being dropped.
          source: { $ifNull: ['$attribution.source', 'direct'] },
          medium: { $ifNull: ['$attribution.medium', null] },
          campaign: { $ifNull: ['$attribution.campaign', null] },
        },
        n: { $sum: 1 },
        rev: { $sum: '$total' },
      },
    },
  ]);

  for (const a of attributed) {
    const row = {
      source: a._id.source ?? 'direct',
      medium: a._id.medium ?? undefined,
      campaign: a._id.campaign ?? undefined,
    };
    const key = sourceKey(row);
    const existing = merged.get(key) ?? { ...row, sessions: 0, orders: 0, revenue: 0, conversion: 0 };
    existing.orders += a.n;
    existing.revenue = round2(existing.revenue + a.rev);
    merged.set(key, existing);
  }

  return [...merged.values()]
    .map((s) => ({ ...s, conversion: s.sessions ? round2(s.orders / s.sessions) : 0 }))
    .sort((a, b) => b.revenue - a.revenue || b.sessions - a.sessions);
}

export async function buildReport(from: string, to: string): Promise<AnalyticsDTO> {
  const days = eachDay(from, to);
  const span = days.length;
  // The comparison window is the same length, ending the day before `from`.
  const prevTo = shiftDays(from, -1);
  const prevFrom = shiftDays(prevTo, -(span - 1));

  const [rows, prevRows] = await Promise.all([rowsFor(from, to), rowsFor(prevFrom, prevTo)]);

  const byDate = new Map(rows.map((r) => [r.date, r]));
  const series: AnalyticsPointDTO[] = days.map((d) => {
    const r = byDate.get(d);
    // A day with no stored row is a real zero, not a gap — the chart must not skip it.
    return { date: d, sessions: r?.sessions ?? 0, orders: r?.orders ?? 0, revenue: r?.revenue ?? 0 };
  });

  // Index-aligned with `series` so the chart can overlay them on one x-axis; the
  // dates are the comparison period's own, surfaced in the tooltip.
  const prevDays = eachDay(prevFrom, prevTo);
  const prevByDate = new Map(prevRows.map((r) => [r.date, r]));
  const previousSeries: AnalyticsPointDTO[] = prevDays.map((d) => {
    const r = prevByDate.get(d);
    return { date: d, sessions: r?.sessions ?? 0, orders: r?.orders ?? 0, revenue: r?.revenue ?? 0 };
  });

  const funnel = sumFunnel(rows);
  const revenue = round2(rows.reduce((n, r) => n + r.revenue, 0));
  const previousRevenue = round2(prevRows.reduce((n, r) => n + r.revenue, 0));

  const { start } = dayBounds(from);
  const { end } = dayBounds(to);
  const sources = await buildSources(rows, start, end);
  const cohorts = await computeCohorts(start, end);

  return {
    range: { from, to },
    funnel,
    previous: sumFunnel(prevRows),
    series,
    previousSeries,
    revenue,
    previousRevenue,
    aov: funnel.orders ? round2(revenue / funnel.orders) : 0,
    sources,
    cohorts,
  };
}
