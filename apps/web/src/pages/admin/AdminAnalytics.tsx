import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { AnalyticsDTO, AnalyticsFunnelDTO } from '@herencia/shared';
import { adminFetchAnalytics } from '../../features/admin/adminClient';
import { LineChart } from '../../components/charts/LineChart';
import { Skeleton } from '../../components/Skeleton';

const egp = (n: number) => `EGP ${Math.round(n).toLocaleString()}`;
const pct = (n: number) => `${Math.round(n * 100)}%`;

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
] as const;

function dayKey(offset: number): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

/** Percentage change vs the comparison period, or null when there is no baseline. */
function delta(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return (current - previous) / previous;
}

function Trend({ current, previous }: { current: number; previous: number }) {
  const d = delta(current, previous);
  if (d === null) return <span className="font-body text-xs text-muted">no prior data</span>;
  const up = d >= 0;
  return (
    <span className={`font-body text-xs ${up ? 'text-success' : 'text-warning'}`}>
      {/* Arrow plus sign, never colour alone. */}
      {up ? '▲' : '▼'} {Math.abs(Math.round(d * 100))}% vs previous
    </span>
  );
}

const STEPS: { key: keyof AnalyticsFunnelDTO; label: string }[] = [
  { key: 'sessions', label: 'Visits' },
  { key: 'productViews', label: 'Viewed a product' },
  { key: 'addToCarts', label: 'Added to cart' },
  { key: 'checkoutStarts', label: 'Started checkout' },
  { key: 'orders', label: 'Ordered' },
];

function Funnel({ funnel }: { funnel: AnalyticsFunnelDTO }) {
  const top = funnel.sessions || 1;
  if (funnel.sessions === 0) {
    return <p className="font-body text-sm text-muted">No visits recorded in this period yet.</p>;
  }
  // Orders are counted from the orders table and visits from tracking, so an order
  // whose visit was never tracked (placed before analytics shipped, or with a
  // blocker) makes the last step exceed the one above it. Say so, rather than
  // leaving a funnel that looks broken.
  const untracked = funnel.orders > funnel.checkoutStarts;
  return (
    <ol className="space-y-3">
      {STEPS.map((step, i) => {
        const value = funnel[step.key];
        const prev = i === 0 ? null : funnel[STEPS[i - 1]!.key];
        const dropped = prev != null && prev > 0 ? 1 - value / prev : null;
        return (
          <li key={step.key}>
            <div className="mb-1 flex items-baseline justify-between gap-3 font-body text-sm">
              <span className="text-content">{step.label}</span>
              <span className="tabular-nums text-content">
                {value.toLocaleString()}
                {dropped != null && dropped > 0 && (
                  <span className="ml-2 text-xs text-muted">−{pct(dropped)}</span>
                )}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded bg-surface2">
              <div
                className="h-full rounded"
                style={{ width: `${Math.max((value / top) * 100, value > 0 ? 1.5 : 0)}%`, background: 'var(--chart-1)' }}
              />
            </div>
          </li>
        );
      })}
      {untracked && (
        <li className="pt-1">
          <p className="font-body text-xs text-muted">
            More orders than tracked checkouts — some were placed by visitors whose visit
            wasn&apos;t tracked. Order counts are always exact; visit counts are not.
          </p>
        </li>
      )}
    </ol>
  );
}

function Panel({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card-lux rounded-xl p-5">
      <div className="mb-4">
        <h2 className="font-display text-lg text-content">{title}</h2>
        {hint && <p className="mt-0.5 font-body text-xs text-muted">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

export default function AdminAnalytics() {
  const [days, setDays] = useState<number>(30);
  const range = { from: dayKey(-(days - 1)), to: dayKey(0) };

  const q = useQuery<AnalyticsDTO>({
    queryKey: ['admin-analytics', range.from, range.to],
    queryFn: () => adminFetchAnalytics(range),
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-content">Analytics</h1>
          <p className="font-body text-xs text-muted">
            Visit counts are first-party and approximate; orders and revenue are exact.
          </p>
        </div>
        {/* Filters in one row above the charts. */}
        <div className="flex gap-2" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button
              key={r.days}
              type="button"
              onClick={() => setDays(r.days)}
              aria-pressed={days === r.days}
              className={`rounded-md border px-3 py-1.5 font-body text-sm transition-colors ${
                days === r.days
                  ? 'border-accent bg-accent text-surface'
                  : 'border-line text-muted hover:border-accent hover:text-content'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {q.isLoading && <Skeleton className="h-96 w-full" />}
      {q.isError && <p className="font-body text-sm text-warning">Could not load analytics.</p>}

      {q.data && (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="card-lux rounded-xl p-5">
              <p className="font-body text-xs uppercase tracking-[0.15em] text-muted">Revenue</p>
              <p className="mt-1 font-display text-2xl text-content">{egp(q.data.revenue)}</p>
              <Trend current={q.data.revenue} previous={q.data.previousRevenue} />
            </div>
            <div className="card-lux rounded-xl p-5">
              <p className="font-body text-xs uppercase tracking-[0.15em] text-muted">Orders</p>
              <p className="mt-1 font-display text-2xl text-content">{q.data.funnel.orders.toLocaleString()}</p>
              <Trend current={q.data.funnel.orders} previous={q.data.previous.orders} />
            </div>
            <div className="card-lux rounded-xl p-5">
              <p className="font-body text-xs uppercase tracking-[0.15em] text-muted">Average order</p>
              <p className="mt-1 font-display text-2xl text-content">{egp(q.data.aov)}</p>
              <p className="font-body text-xs text-muted">across the selected range</p>
            </div>
          </div>

          <Panel title="Revenue over time" hint={`${range.from} to ${range.to}, against the previous ${days} days`}>
            <LineChart
              label="Revenue"
              comparisonLabel="Previous period"
              format={egp}
              points={q.data.series.map((p) => ({ x: p.date, y: p.revenue }))}
              comparison={q.data.previousSeries.map((p) => ({ x: p.date, y: p.revenue }))}
            />
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Where people drop off" hint="Each step as a share of visits">
              <Funnel funnel={q.data.funnel} />
            </Panel>

            <Panel title="Customers" hint="Identified by phone number">
              {q.data.cohorts.newCustomers + q.data.cohorts.returningCustomers === 0 ? (
                <p className="font-body text-sm text-muted">No orders in this period yet.</p>
              ) : (
                <dl className="grid grid-cols-2 gap-4 font-body text-sm">
                  <div>
                    <dt className="text-muted">New customers</dt>
                    <dd className="font-display text-xl text-content">{q.data.cohorts.newCustomers}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Returning</dt>
                    <dd className="font-display text-xl text-content">{q.data.cohorts.returningCustomers}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Repeat rate</dt>
                    <dd className="font-display text-xl text-content">{pct(q.data.cohorts.repeatRate)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Lifetime value</dt>
                    <dd className="font-display text-xl text-content">{egp(q.data.cohorts.avgLtv)}</dd>
                  </div>
                </dl>
              )}
            </Panel>
          </div>

          <Panel title="Where visitors came from" hint="Revenue is attributed to the campaign that brought the customer in">
            {q.data.sources.length === 0 ? (
              <p className="font-body text-sm text-muted">No traffic recorded in this period yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[36rem] font-body text-sm">
                  <thead>
                    <tr className="border-b border-hairline text-left text-xs uppercase tracking-wider text-muted">
                      <th scope="col" className="pb-2 pr-3">Source</th>
                      <th scope="col" className="pb-2 pr-3">Campaign</th>
                      <th scope="col" className="pb-2 pr-3 text-right">Visits</th>
                      <th scope="col" className="pb-2 pr-3 text-right">Orders</th>
                      <th scope="col" className="pb-2 pr-3 text-right">Conv.</th>
                      <th scope="col" className="pb-2 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.sources.map((s) => (
                      <tr key={`${s.source}|${s.medium ?? ''}|${s.campaign ?? ''}`} className="border-b border-hairline/60">
                        <td className="py-2 pr-3 text-content">{s.source}</td>
                        <td className="py-2 pr-3 text-muted">{s.campaign ?? '—'}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-content">{s.sessions.toLocaleString()}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-content">{s.orders.toLocaleString()}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-muted">
                          {s.sessions ? pct(s.conversion) : '—'}
                        </td>
                        <td className="py-2 text-right tabular-nums text-content">{egp(s.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}
