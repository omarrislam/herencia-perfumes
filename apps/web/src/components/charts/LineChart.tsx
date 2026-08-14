import { useId, useMemo, useState } from 'react';

export type Point = { x: string; y: number };

type Props = {
  points: Point[];
  label: string;
  comparison?: Point[];
  comparisonLabel?: string;
  /** Formats a y value for labels and tooltips. */
  format?: (n: number) => string;
};

const W = 720;
const H = 200;
const PAD = { top: 14, right: 14, bottom: 22, left: 14 };

/**
 * A single-measure line chart with an optional comparison series.
 *
 * Hand-rolled rather than pulling in a charting library: two paths and an axis do
 * not justify ~100 kB against the project's Lighthouse budget.
 *
 * Colours come from --chart-1/--chart-2, which were validated with the dataviz
 * palette checker in both themes. The comparison series is additionally dashed and
 * directly labelled, so the two are never distinguished by colour alone.
 */
export function LineChart({ points, label, comparison, comparisonLabel = 'Previous', format }: Props) {
  const titleId = useId();
  const [hover, setHover] = useState<number | null>(null);
  const fmt = format ?? ((n: number) => String(n));

  const geometry = useMemo(() => {
    if (points.length === 0) return null;
    const all = [...points.map((p) => p.y), ...(comparison ?? []).map((p) => p.y)];
    const max = Math.max(...all);
    const min = Math.min(0, ...all);
    // A flat series (or a single point) would otherwise divide by zero.
    const span = max - min || 1;
    const plotW = W - PAD.left - PAD.right;
    const plotH = H - PAD.top - PAD.bottom;
    // One point sits centred rather than at x=0 with a zero-width step.
    const step = points.length > 1 ? plotW / (points.length - 1) : 0;

    const project = (i: number, y: number) => ({
      cx: points.length > 1 ? PAD.left + i * step : PAD.left + plotW / 2,
      cy: PAD.top + plotH - ((y - min) / span) * plotH,
    });

    const path = (series: Point[]) =>
      series
        .map((p, i) => {
          const { cx, cy } = project(i, p.y);
          return `${i === 0 ? 'M' : 'L'}${cx.toFixed(2)} ${cy.toFixed(2)}`;
        })
        .join(' ');

    return { max, project, path, plotH, step };
  }, [points, comparison]);

  if (!geometry) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-hairline bg-surface2/40">
        <p className="font-body text-sm text-muted">No data for this period yet.</p>
      </div>
    );
  }

  const last = points[points.length - 1]!;
  const peak = points.reduce((a, b) => (b.y > a.y ? b : a), points[0]!);
  const active = hover != null ? points[hover] : null;
  const activeCmp = hover != null ? comparison?.[hover] : null;

  return (
    <figure className="m-0">
      {comparison && comparison.length > 0 && (
        <figcaption className="mb-2 flex flex-wrap items-center gap-4 font-body text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-0.5 w-4 rounded" style={{ background: 'var(--chart-1)' }} />
            {label}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block h-0.5 w-4 rounded"
              style={{ backgroundImage: 'repeating-linear-gradient(90deg, var(--chart-2) 0 4px, transparent 4px 7px)' }}
            />
            {comparisonLabel}
          </span>
        </figcaption>
      )}

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-labelledby={titleId}
          preserveAspectRatio="none"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const ratio = (e.clientX - rect.left) / rect.width;
            const i = Math.round(ratio * (points.length - 1));
            setHover(Math.max(0, Math.min(points.length - 1, i)));
          }}
        >
          <title id={titleId}>{`${label}: ${points.length} days, peak ${fmt(peak.y)}, latest ${fmt(last.y)}`}</title>

          {/* Recessive baseline only — no grid. */}
          <line
            x1={PAD.left}
            y1={PAD.top + geometry.plotH}
            x2={W - PAD.right}
            y2={PAD.top + geometry.plotH}
            stroke="currentColor"
            className="text-muted/25"
            strokeWidth={1}
          />

          {comparison && comparison.length > 0 && (
            <path
              data-series="comparison"
              d={geometry.path(comparison)}
              fill="none"
              stroke="var(--chart-2)"
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          <path
            data-series="main"
            d={geometry.path(points)}
            fill="none"
            stroke="var(--chart-1)"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {hover != null && active && (
            <g aria-hidden>
              <line
                x1={geometry.project(hover, active.y).cx}
                y1={PAD.top}
                x2={geometry.project(hover, active.y).cx}
                y2={PAD.top + geometry.plotH}
                stroke="currentColor"
                className="text-muted/40"
                strokeWidth={1}
              />
              {/* 2px surface ring keeps the marker legible where the lines overlap. */}
              <circle
                cx={geometry.project(hover, active.y).cx}
                cy={geometry.project(hover, active.y).cy}
                r={5}
                fill="var(--chart-1)"
                stroke="var(--surface)"
                strokeWidth={2}
              />
              {activeCmp && (
                <circle
                  cx={geometry.project(hover, activeCmp.y).cx}
                  cy={geometry.project(hover, activeCmp.y).cy}
                  r={5}
                  fill="var(--chart-2)"
                  stroke="var(--surface)"
                  strokeWidth={2}
                />
              )}
            </g>
          )}
        </svg>

        {active && (
          <div
            className="pointer-events-none absolute top-0 rounded-md border border-hairline bg-surface px-2.5 py-1.5 font-body text-xs shadow-sm"
            style={{
              left: `${(hover! / Math.max(points.length - 1, 1)) * 100}%`,
              transform: 'translateX(-50%)',
            }}
          >
            <p className="text-muted">{active.x}</p>
            <p className="text-content">{fmt(active.y)}</p>
            {activeCmp && <p className="text-muted">{`${comparisonLabel}: ${fmt(activeCmp.y)}`}</p>}
          </div>
        )}
      </div>

      {/* Selective direct labels — first and last only, never a number on every point. */}
      <div className="mt-1 flex justify-between font-body text-[11px] text-muted">
        <span>{points[0]!.x}</span>
        <span>{last.x}</span>
      </div>

      {/* Table view: the numbers must be reachable without reading the picture. */}
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">{label}</th>
          </tr>
        </thead>
        <tbody>
          {points.map((p) => (
            <tr key={p.x}>
              <th scope="row">{p.x}</th>
              <td>{fmt(p.y)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
