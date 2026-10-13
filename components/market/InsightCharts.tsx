import { formatMonthLabel, formatNumber } from "@/lib/utils/format";

/** "Sep 2024" → "Sep '24", for crowded chart axes. */
function axisMonth(value: string): string {
  const label = formatMonthLabel(value);
  const [month, year] = label.split(" ");
  if (!month || !year || year.length < 2) return label;
  return `${month} '${year.slice(-2)}`;
}

const MIX_COLORS = [
  "var(--color-navy)",
  "var(--color-gold)",
  "var(--color-ink-muted)",
  "var(--color-ink)",
  "var(--color-navy-soft)",
];

/**
 * Sales vs new listings, the paired bars on the HomeAtlas market page.
 * Sales are closed transactions; listings are new active catalogue rows.
 */
export function SalesListingsChart({
  rows,
}: {
  rows: Array<{ month: string; sales: number; listings: number }>;
}) {
  const points = rows.filter((row) => row.sales > 0 || row.listings > 0);
  if (points.length < 2) {
    return (
      <p className="rounded-control bg-surface-alt px-4 py-8 text-center text-small text-ink-muted">
        Not enough months to compare sales and new listings.
      </p>
    );
  }

  const width = 640;
  const height = 200;
  const inset = { top: 12, right: 8, bottom: 28, left: 36 };
  const plotW = width - inset.left - inset.right;
  const plotH = height - inset.top - inset.bottom;
  const max = Math.max(...points.flatMap((row) => [row.sales, row.listings]), 1);
  const group = plotW / points.length;
  const bar = Math.min(14, group * 0.28);

  const y = (value: number) => inset.top + plotH - (value / max) * plotH;
  const h = (value: number) => (value / max) * plotH;

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Sales compared with new listings">
        {[0, 0.5, 1].map((tick) => (
          <line
            key={tick}
            x1={inset.left}
            x2={width - inset.right}
            y1={y(max * tick)}
            y2={y(max * tick)}
            stroke="var(--color-line)"
            strokeDasharray="3 3"
          />
        ))}
        {points.map((row, i) => {
          const cx = inset.left + group * i + group / 2;
          return (
            <g key={row.month}>
              <rect x={cx - bar - 1} y={y(row.sales)} width={bar} height={h(row.sales)} rx="3" fill="var(--color-navy)" />
              <rect x={cx + 1} y={y(row.listings)} width={bar} height={h(row.listings)} rx="3" fill="#e8e8e8" />
              <text x={cx} y={height - 8} textAnchor="middle" className="fill-[var(--color-ink-subtle)] text-[10px]">
                {axisMonth(row.month).split(" ")[0]}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-3 flex gap-4 text-[12px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-navy" /> Sales
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-[#e8e8e8]" /> New listings
        </span>
        <table className="sr-only">
          <caption>Sales and new listings by month</caption>
          <thead>
            <tr>
              <th>Month</th>
              <th>Sales</th>
              <th>New listings</th>
            </tr>
          </thead>
          <tbody>
            {points.map((row) => (
              <tr key={row.month}>
                <th>{formatMonthLabel(row.month)}</th>
                <td>{formatNumber(row.sales)}</td>
                <td>{formatNumber(row.listings)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figcaption>
    </figure>
  );
}

/** Average days on market, the gold line beside the sales bars. */
export function DaysOnMarketChart({
  rows,
}: {
  rows: Array<{ month: string; days: number }>;
}) {
  if (rows.length < 2) {
    return (
      <p className="rounded-control bg-surface-alt px-4 py-8 text-center text-small text-ink-muted">
        Not enough months to chart days on market.
      </p>
    );
  }

  const width = 640;
  const height = 200;
  const inset = { top: 16, right: 12, bottom: 28, left: 32 };
  const plotW = width - inset.left - inset.right;
  const plotH = height - inset.top - inset.bottom;
  const values = rows.map((row) => row.days);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.2 || 2;
  const lo = Math.max(0, min - pad);
  const hi = max + pad;
  const x = (i: number) => inset.left + (i / (rows.length - 1)) * plotW;
  const y = (value: number) => inset.top + plotH - ((value - lo) / (hi - lo)) * plotH;
  const line = rows.map((row, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(row.days).toFixed(1)}`).join(" ");

  return (
    <figure>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Average days on market">
        {[0, 0.5, 1].map((tick) => {
          const value = lo + (hi - lo) * tick;
          return (
            <g key={tick}>
              <line
                x1={inset.left}
                x2={width - inset.right}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--color-line)"
                strokeDasharray="3 3"
              />
              <text x={inset.left - 6} y={y(value) + 3} textAnchor="end" className="fill-[var(--color-ink-subtle)] text-[10px]">
                {Math.round(value)}
              </text>
            </g>
          );
        })}
        <path d={line} fill="none" stroke="var(--color-gold)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {rows.map((row, i) => (
          <circle key={row.month} cx={x(i)} cy={y(row.days)} r="4" fill="var(--color-gold)" />
        ))}
        {rows.map((row, i) =>
          i % Math.ceil(rows.length / 6) === 0 || i === rows.length - 1 ? (
            <text key={`l-${row.month}`} x={x(i)} y={height - 8} textAnchor="middle" className="fill-[var(--color-ink-subtle)] text-[10px]">
              {axisMonth(row.month)}
            </text>
          ) : null,
        )}
      </svg>
      <table className="sr-only">
        <caption>Average days on market by month</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Days</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.month}>
              <th>{formatMonthLabel(row.month)}</th>
              <td>{Math.round(row.days)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

/** Donut plus share bars, the property-type block on the HomeAtlas market page. */
export function TypeMix({ rows }: { rows: Array<{ name: string; count: number }> }) {
  const items = rows.filter((row) => row.count > 0).slice(0, 5);
  const total = items.reduce((sum, row) => sum + row.count, 0);
  if (total === 0) return null;

  const slices = items.map((item, index) => ({
    ...item,
    pct: (item.count / total) * 100,
    color: MIX_COLORS[index % MIX_COLORS.length],
  }));

  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-8 sm:flex-row">
      <svg viewBox="0 0 220 220" className="h-[220px] w-[220px] shrink-0" role="img" aria-label="Property type mix">
        <g transform="rotate(-90 110 110)">
          {slices.map((slice) => {
            const length = (slice.pct / 100) * circumference;
            const node = (
              <circle
                key={slice.name}
                cx="110"
                cy="110"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth="28"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
              />
            );
            offset += length;
            return node;
          })}
        </g>
      </svg>
      <dl className="w-full flex-1 space-y-3">
        {slices.map((slice) => (
          <div key={slice.name} className="flex items-center justify-between gap-4">
            <dt className="flex min-w-0 items-center gap-2 text-small text-ink">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: slice.color }} />
              <span className="truncate">{slice.name}</span>
            </dt>
            <dd className="flex items-center gap-3">
              <span className="h-2 w-24 overflow-hidden rounded-full bg-surface-alt">
                <span className="block h-2 rounded-full" style={{ width: `${slice.pct}%`, background: slice.color }} />
              </span>
              <span className="w-10 text-right text-small font-semibold text-ink">{Math.round(slice.pct)}%</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
