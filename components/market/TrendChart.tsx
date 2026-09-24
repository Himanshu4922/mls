import { formatMonthLabel, formatPriceCompact } from "@/lib/utils/format";
import type { TrendPoint } from "@/lib/api/market";

/**
 * Median-price line chart.
 *
 * Hand-drawn SVG rather than a charting library: the reference used Recharts,
 * but these charts are simple, and a server-rendered SVG keeps the page a
 * Server Component with zero client JS and no added dependency. The data table
 * below the chart carries the same values for screen readers.
 */
export function TrendChart({
  series,
  height = 220,
}: {
  series: TrendPoint[];
  height?: number;
}) {
  const points = series.filter((point) => point.medianListPrice !== null);

  if (points.length < 2) {
    return (
      <p className="rounded-control bg-surface-alt px-4 py-8 text-center text-small text-ink-muted">
        Not enough data to chart a trend for this area yet.
      </p>
    );
  }

  const values = points.map((p) => p.medianListPrice as number);
  const min = Math.min(...values);
  const max = Math.max(...values);
  // Pad the domain so the line never sits flat against an edge.
  const pad = (max - min) * 0.15 || max * 0.05 || 1;
  const lo = Math.max(0, min - pad);
  const hi = max + pad;

  const width = 720;
  const inset = { top: 16, right: 16, bottom: 28, left: 56 };
  const plotW = width - inset.left - inset.right;
  const plotH = height - inset.top - inset.bottom;

  const x = (i: number) => inset.left + (i / (points.length - 1)) * plotW;
  const y = (value: number) =>
    inset.top + plotH - ((value - lo) / (hi - lo)) * plotH;

  const line = points
    .map((point, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(point.medianListPrice as number).toFixed(1)}`)
    .join(" ");

  const area = `${line} L${x(points.length - 1).toFixed(1)},${(inset.top + plotH).toFixed(1)} L${x(0).toFixed(1)},${(inset.top + plotH).toFixed(1)} Z`;

  // Four horizontal gridlines including both bounds.
  const ticks = Array.from({ length: 4 }, (_, i) => lo + ((hi - lo) * i) / 3);

  const first = values[0];
  const last = values[values.length - 1];
  const changePct = first > 0 ? ((last - first) / first) * 100 : 0;

  return (
    <figure className="space-y-3">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Median list price from ${formatMonthLabel(points[0].month)} to ${formatMonthLabel(points[points.length - 1].month)}, changing ${changePct >= 0 ? "up" : "down"} ${Math.abs(changePct).toFixed(1)} percent.`}
      >
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={inset.left}
              x2={width - inset.right}
              y1={y(tick)}
              y2={y(tick)}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
            <text
              x={inset.left - 8}
              y={y(tick) + 4}
              textAnchor="end"
              className="fill-[var(--color-ink-subtle)] text-[10px]"
            >
              {formatPriceCompact(tick)}
            </text>
          </g>
        ))}

        <path d={area} fill="var(--color-navy)" opacity="0.07" />
        <path
          d={line}
          fill="none"
          stroke="var(--color-navy)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {points.map((point, i) => (
          <circle
            key={point.month}
            cx={x(i)}
            cy={y(point.medianListPrice as number)}
            r={i === points.length - 1 ? 4.5 : 2.5}
            fill={i === points.length - 1 ? "var(--color-gold)" : "var(--color-navy)"}
          />
        ))}

        {points.map((point, i) =>
          // Label roughly six ticks to avoid crowding on narrow screens.
          i % Math.ceil(points.length / 6) === 0 || i === points.length - 1 ? (
            <text
              key={`label-${point.month}`}
              x={x(i)}
              y={height - 8}
              textAnchor="middle"
              className="fill-[var(--color-ink-subtle)] text-[10px]"
            >
              {formatMonthLabel(point.month)}
            </text>
          ) : null,
        )}
      </svg>

      <figcaption className="sr-only">
        <table>
          <caption>Median list price by month</caption>
          <thead>
            <tr>
              <th scope="col">Month</th>
              <th scope="col">Median list price</th>
              <th scope="col">New listings</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.month}>
                <th scope="row">{formatMonthLabel(point.month)}</th>
                <td>{formatPriceCompact(point.medianListPrice)}</td>
                <td>{point.newListings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

/** Horizontal bar breakdown used for bedroom / property-type segmentation. */
export function SegmentBars({
  data,
  label,
}: {
  data: Array<{ name: string; count: number }>;
  label: string;
}) {
  const rows = data.filter((row) => row.count > 0).slice(0, 6);
  if (rows.length === 0) return null;

  const max = Math.max(...rows.map((row) => row.count));

  return (
    <div>
      <h3 className="text-h3 text-ink">{label}</h3>
      <dl className="mt-4 space-y-2.5">
        {rows.map((row) => (
          <div key={row.name} className="grid grid-cols-[7rem_1fr_3rem] items-center gap-3">
            <dt className="truncate text-caption text-ink-muted" title={row.name}>
              {row.name}
            </dt>
            <dd className="h-2 overflow-hidden rounded-full bg-line">
              <div
                className="h-full rounded-full bg-navy"
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </dd>
            <dd className="text-right text-caption text-ink">
              {row.count.toLocaleString("en-CA")}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
