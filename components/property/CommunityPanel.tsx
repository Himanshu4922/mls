import { safeFetch } from "@/lib/api/client";
import { getCatalogStats, getMarketTrends } from "@/lib/api/market";
import {
  getCensusProfile,
  getNearbyAmenities,
  getNearbySchools,
  type AmenitiesByCategory,
  type CensusProfile,
  type NearbySchool,
} from "@/lib/api/neighbourhood";
import { searchProperties } from "@/lib/api/properties";
import {
  getWpCommunityProfile,
  type WpCommunityProfile,
} from "@/lib/api/wpCommunity";
import { AmenitiesSection } from "@/components/property/Neighbourhood";
import type { PropertySummary } from "@/lib/types/domain";
import { formatPrice } from "@/lib/utils/format";

const TYPE_COLORS = ["#1e3a5f", "#c7a45a", "#6f7682", "#151515", "#d6d3cd", "#8aa0b8"];

/**
 * Community tab. Neighbourhood Insights prefer the WordPress community CPT;
 * when that city isn't curated yet we fall back to census + nearby places +
 * live catalogue stats so the section still appears on every listing.
 */
export async function CommunityPanel({
  city,
  neighbourhood,
  postalCode,
  latitude,
  longitude,
}: {
  city: string | null;
  neighbourhood?: string | null;
  postalCode: string | null;
  latitude: number | null;
  longitude: number | null;
}) {
  const fsa = postalCode?.replace(/\s/g, "").slice(0, 3) ?? "";
  const emptySold = {
    items: [] as PropertySummary[],
    total: 0,
    nextOffset: null,
    previousOffset: null,
    approximate: false,
    truncated: false,
  };
  const emptyAmenities: AmenitiesByCategory = {
    groceries: [],
    cafes: [],
    parks: [],
    transit: [],
  };
  const [stats, trends, census, wpCommunity, amenities, nearbySchools, sold, active] =
    await Promise.all([
      city
        ? safeFetch(getCatalogStats({ city }), null, "property:catalog")
        : Promise.resolve(null),
      city
        ? safeFetch(getMarketTrends({ city }, 12), null, "property:trends")
        : Promise.resolve(null),
      fsa ? getCensusProfile(fsa) : Promise.resolve(null),
      safeFetch(
        getWpCommunityProfile(city, neighbourhood),
        null,
        "property:wp-community",
      ),
      latitude !== null && longitude !== null
        ? safeFetch(
            getNearbyAmenities(latitude, longitude),
            emptyAmenities,
            "property:amenities",
          )
        : Promise.resolve(null),
      latitude !== null && longitude !== null
        ? safeFetch(getNearbySchools(latitude, longitude, { radius: 4000 }), [], "property:nearby-schools")
        : Promise.resolve([] as NearbySchool[]),
      city
        ? safeFetch(searchProperties({ city, status: "Sold", limit: 24 }), emptySold, "property:sold-dist")
        : Promise.resolve(emptySold),
      city
        ? safeFetch(searchProperties({ city, status: "Active", limit: 24 }), emptySold, "property:ask-dist")
        : Promise.resolve(emptySold),
    ]);

  const series = (trends?.series ?? []).filter((point) => point.medianListPrice !== null);
  const subtypes = trends?.bySubtype ?? [];
  const latestNew = trends?.series.at(-1)?.newListings;
  const insights = buildInsights({
    city,
    neighbourhood,
    wp: wpCommunity,
    census,
    statsMedian: stats?.medianListPrice ?? null,
    activeCount: trends?.activeCurrent ?? null,
    yearChangeLabel: yearChange(series),
    amenities,
    schools: nearbySchools,
  });

  return (
    <div className="space-y-8">
      {insights && <NeighbourhoodInsights insights={insights} />}

      <div>
        <h2 className="mb-1 text-[20px] font-semibold text-ink">Community Statistics</h2>
        <p className="mb-5 text-[13px] text-ink-muted">
          {city
            ? `Active listings in ${city}. These are asking prices, not sold prices.`
            : "This listing has no city, so community figures are unavailable."}
        </p>
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          <Stat label="Median Price" value={stats?.medianListPrice ? formatPrice(stats.medianListPrice) : "—"} />
          <Stat label="New Listings" value={latestNew != null ? String(latestNew) : "—"} />
          <Stat label="Active Listings" value={trends?.activeCurrent != null ? String(trends.activeCurrent) : "—"} />
        </div>
        {yearChange(series) && (
          <p className="mb-2 text-[12px] font-medium text-ink">12 months: {yearChange(series)}</p>
        )}
        {stats?.disclaimer && (
          <p className="mt-3 text-[11px] text-ink-subtle">{stats.disclaimer}</p>
        )}
      </div>

      {series.length > 1 && (
        <TrendChart
          points={series.map((point) => ({
            month: point.month,
            median: point.medianListPrice!,
            mean: point.meanListPrice,
          }))}
          city={city}
        />
      )}

      <PriceDistribution
        sold={sold.items.map((item) => item.closePrice ?? item.price)}
        asking={active.items.map((item) => (item.isLease ? null : item.price))}
        city={city}
      />

      {subtypes.length > 0 && <TypeSplit slices={subtypes.slice(0, 6)} city={city} />}

      {census && !wpCommunity && <CensusBlock census={census} />}

      {amenities && <AmenitiesSection amenities={amenities} />}
    </div>
  );
}

interface InsightsView {
  title: string;
  subtext: string | null;
  sourceNote: string;
  tiles: Array<{ label: string; value: string }>;
  blurb: string | null;
  schools: Array<{ name: string; rating: string | null; type: string | null }>;
  parks: string[];
  dining: string[];
  transit: Array<{ name: string; subtext: string | null; time: string | null }>;
}

function buildInsights({
  city,
  neighbourhood,
  wp,
  census,
  statsMedian,
  activeCount,
  yearChangeLabel,
  amenities,
  schools,
}: {
  city: string | null;
  neighbourhood?: string | null;
  wp: WpCommunityProfile | null;
  census: CensusProfile | null;
  statsMedian: number | null;
  activeCount: number | null;
  yearChangeLabel: string | null;
  amenities: AmenitiesByCategory | null;
  schools: NearbySchool[];
}): InsightsView | null {
  if (wp) {
    const tiles = [
      wp.population ? { label: "Population", value: wp.population } : null,
      wp.averageHomePrice ? { label: "Avg. home price", value: wp.averageHomePrice } : null,
      wp.yoyGrowth ? { label: "YoY growth", value: wp.yoyGrowth } : null,
      wp.livabilityScore ? { label: "Livability score", value: wp.livabilityScore } : null,
    ].filter((tile): tile is { label: string; value: string } => tile !== null);

    return {
      title: wp.name,
      subtext: wp.subtext,
      sourceNote: "Curated community profile",
      tiles,
      blurb: wp.whyFamiliesLove,
      schools: wp.schools,
      parks: wp.parks,
      dining: wp.dining,
      transit: wp.transit,
    };
  }

  const place =
    [neighbourhood, city].filter((part): part is string => Boolean(part?.trim())).join(", ") ||
    city ||
    neighbourhood ||
    null;
  if (!place && !census && !amenities && statsMedian === null) return null;

  const tiles: Array<{ label: string; value: string }> = [];
  if (census?.population) {
    tiles.push({ label: "Population", value: census.population.toLocaleString("en-CA") });
  }
  if (census?.medianAge) {
    tiles.push({ label: "Median age", value: String(census.medianAge) });
  }
  if (census?.averageHouseholdIncome) {
    tiles.push({ label: "Avg. household income", value: census.averageHouseholdIncome });
  }
  if (statsMedian) {
    tiles.push({ label: "Median list price", value: formatPrice(statsMedian) });
  }
  if (yearChangeLabel) {
    tiles.push({ label: "12-mo list price", value: yearChangeLabel });
  }
  if (activeCount != null) {
    tiles.push({ label: "Active listings", value: String(activeCount) });
  }

  const schoolRows = schools.slice(0, 4).map((school) => ({
    name: school.name,
    rating: null as string | null,
    type: school.kind || school.operator,
  }));
  const parks = (amenities?.parks ?? []).slice(0, 4).map((item) => item.name);
  const dining = (amenities?.cafes ?? []).slice(0, 4).map((item) => item.name);
  const transit = (amenities?.transit ?? []).slice(0, 4).map((item) => ({
    name: item.name,
    subtext: item.address,
    time: null as string | null,
  }));

  const hasBody =
    tiles.length > 0 ||
    schoolRows.length > 0 ||
    parks.length > 0 ||
    dining.length > 0 ||
    transit.length > 0;
  if (!hasBody) return null;

  return {
    title: place ?? "This area",
    subtext: neighbourhood && city && neighbourhood !== city ? city : null,
    sourceNote: census
      ? "Local market and census snapshot"
      : "Local market and nearby places",
    tiles,
    blurb: null,
    schools: schoolRows,
    parks,
    dining,
    transit,
  };
}

function NeighbourhoodInsights({ insights }: { insights: InsightsView }) {
  return (
    <div className="space-y-6 rounded-2xl border border-line p-4 sm:p-5">
      <div>
        <h2 className="text-[20px] font-semibold text-ink">Neighbourhood Insights</h2>
        <p className="mt-1 text-[13px] text-ink-muted">
          {insights.sourceNote} for {insights.title}
          {insights.subtext ? ` — ${insights.subtext}` : ""}.
        </p>
      </div>

      {insights.tiles.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {insights.tiles.map((tile) => (
            <Stat key={tile.label} label={tile.label} value={tile.value} />
          ))}
        </div>
      )}

      {insights.blurb && (
        <p className="whitespace-pre-line text-[14px] leading-relaxed text-ink-soft">
          {insights.blurb}
        </p>
      )}

      {insights.schools.length > 0 && (
        <div>
          <h3 className="mb-3 text-[14px] font-semibold text-ink">Nearby schools</h3>
          <ul className="space-y-2">
            {insights.schools.map((school) => (
              <li
                key={school.name}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-alt px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold text-ink">{school.name}</p>
                  {school.type && <p className="text-[12px] text-ink-muted">{school.type}</p>}
                </div>
                {school.rating && (
                  <span className="shrink-0 text-[15px] font-semibold text-navy">{school.rating}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(insights.parks.length > 0 || insights.dining.length > 0 || insights.transit.length > 0) && (
        <div className="grid gap-5 sm:grid-cols-3">
          {insights.parks.length > 0 && <InsightList title="Parks" items={insights.parks} />}
          {insights.dining.length > 0 && <InsightList title="Dining" items={insights.dining} />}
          {insights.transit.length > 0 && (
            <div>
              <h3 className="mb-2 text-[14px] font-semibold text-ink">Transit</h3>
              <ul className="space-y-2 text-[13px] text-ink-soft">
                {insights.transit.map((stop) => (
                  <li key={stop.name}>
                    <span className="font-medium text-ink">{stop.name}</span>
                    {(stop.subtext || stop.time) && (
                      <span className="block text-[12px] text-ink-muted">
                        {[stop.subtext, stop.time].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface-alt p-4">
      <div className="mb-1 text-[11px] text-ink-muted">{label}</div>
      <div className="text-[18px] font-semibold text-ink sm:text-[20px]">{value}</div>
    </div>
  );
}

function yearChange(points: Array<{ medianListPrice: number | null }>): string | null {
  const values = points.map((point) => point.medianListPrice).filter((value): value is number => value !== null);
  if (values.length < 2 || values[0] === 0) return null;
  const pct = ((values[values.length - 1] - values[0]) / values[0]) * 100;
  return `${pct > 0 ? "+" : ""}${pct.toFixed(1)}%`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLabel(iso: string): string {
  const [year, month] = iso.split("-");
  const index = Number(month) - 1;
  if (!year || index < 0 || index > 11) return iso;
  return `${MONTHS[index]} '${year.slice(2)}`;
}

function TrendChart({
  points,
  city,
}: {
  points: Array<{ month: string; median: number; mean: number | null }>;
  city: string | null;
}) {
  const width = 560;
  const height = 220;
  const left = 52;
  const right = 12;
  const top = 16;
  const bottom = 32;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const values = points.flatMap((point) =>
    point.mean !== null ? [point.median, point.mean] : [point.median],
  );
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const yOf = (value: number) => top + innerH - ((value - min) / span) * innerH;
  const xOf = (index: number) =>
    left + (points.length <= 1 ? innerW / 2 : (index / (points.length - 1)) * innerW);
  const median = points.map((point, index) => `${xOf(index)},${yOf(point.median)}`).join(" ");
  const area = `${left},${top + innerH} ${median} ${xOf(points.length - 1)},${top + innerH}`;
  const mean = points
    .map((point, index) => (point.mean === null ? null : `${xOf(index)},${yOf(point.mean)}`))
    .filter((point): point is string => point !== null)
    .join(" ");
  const ticks = [0, 1, 2, 3].map((step) => min + (span * step) / 3);

  return (
    <div className="rounded-2xl border border-line p-4 sm:p-5">
      <h3 className="mb-1 text-[15px] font-semibold text-ink">
        Community Median Price{city ? ` — ${city}` : ""}
      </h3>
      <div className="mb-3 flex flex-wrap gap-4 text-[12px] text-ink-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 bg-navy" /> Median
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-gold" /> Average
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label="Median and average asking price">
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={left} x2={width - right} y1={yOf(tick)} y2={yOf(tick)} stroke="#f0f0f0" />
            <text x={left - 8} y={yOf(tick) + 3} textAnchor="end" fontSize="11" fill="#9fa3aa">
              {compactMoney(tick)}
            </text>
          </g>
        ))}
        <polygon points={area} fill="#1e3a5f" opacity="0.15" />
        <polyline fill="none" stroke="#1e3a5f" strokeWidth="2" points={median} />
        {mean && (
          <polyline fill="none" stroke="#c7a45a" strokeWidth="2" strokeDasharray="4 4" points={mean} />
        )}
        {points.map((point, index) =>
          index % Math.ceil(points.length / 6) === 0 || index === points.length - 1 ? (
            <text key={point.month} x={xOf(index)} y={height - 8} textAnchor="middle" fontSize="11" fill="#9fa3aa">
              {monthLabel(point.month)}
            </text>
          ) : null,
        )}
      </svg>
    </div>
  );
}

function PriceDistribution({
  sold,
  asking,
  city,
}: {
  sold: Array<number | null>;
  asking: Array<number | null>;
  city: string | null;
}) {
  const soldValues = sold.filter((price): price is number => price !== null && price > 0);
  const askingValues = asking.filter((price): price is number => price !== null && price > 0);
  const values = soldValues.length >= 3 ? soldValues : askingValues;
  if (values.length < 3) return null;
  const soldChart = soldValues.length >= 3;
  const buckets = priceBuckets(values);
  const peak = Math.max(...buckets.map((bucket) => bucket.count), 1);
  const width = 560;
  const height = 200;
  const left = 36;
  const right = 8;
  const top = 12;
  const bottom = 36;
  const innerW = width - left - right;
  const innerH = height - top - bottom;
  const gap = 10;
  const barW = (innerW - gap * (buckets.length - 1)) / buckets.length;

  return (
    <div className="rounded-2xl border border-line p-4 sm:p-5">
      <h3 className="mb-1 text-[15px] font-semibold text-ink">
        {soldChart ? "Sold Price Distribution" : "Asking Price Distribution"}
      </h3>
      <p className="mb-4 text-[12px] text-ink-muted">
        {soldChart ? "Recent sold listings" : "Active listings"}
        {city ? ` in ${city}` : ""} in this catalogue.
      </p>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-48 w-full" role="img" aria-label="Price distribution">
        {[0, peak].map((tick) => {
          const y = top + innerH - (tick / peak) * innerH;
          return (
            <g key={tick}>
              <line x1={left} x2={width - right} y1={y} y2={y} stroke="#f0f0f0" />
              <text x={left - 6} y={y + 3} textAnchor="end" fontSize="11" fill="#9fa3aa">
                {tick}
              </text>
            </g>
          );
        })}
        {buckets.map((bucket, index) => {
          const barH = (bucket.count / peak) * innerH;
          const x = left + index * (barW + gap);
          const y = top + innerH - barH;
          return (
            <g key={bucket.label}>
              <rect x={x} y={y} width={barW} height={Math.max(barH, 2)} rx="4" fill="#1e3a5f" />
              <text x={x + barW / 2} y={height - 10} textAnchor="middle" fontSize="11" fill="#9fa3aa">
                {bucket.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function priceBuckets(values: number[]): Array<{ label: string; count: number }> {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const step = Math.max(50_000, Math.ceil((max - min) / 5 / 50_000) * 50_000);
  const start = Math.floor(min / step) * step;
  const buckets = Array.from({ length: 5 }, (_, index) => ({
    from: start + index * step,
    count: 0,
  }));
  for (const value of values) {
    const index = Math.min(4, Math.floor((value - start) / step));
    buckets[Math.max(0, index)].count += 1;
  }
  return buckets.map((bucket) => ({
    label: compactMoney(bucket.from),
    count: bucket.count,
  }));
}

function piePaths(counts: number[]): string[] {
  const total = counts.reduce((sum, count) => sum + count, 0) || 1;
  const cx = 80;
  const cy = 80;
  const radius = 72;
  let angle = -Math.PI / 2;
  return counts.map((count) => {
    const sweep = (count / total) * Math.PI * 2;
    const start = angle;
    angle += sweep;
    const large = sweep > Math.PI ? 1 : 0;
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(angle);
    const y2 = cy + radius * Math.sin(angle);
    if (count >= total) return `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
  });
}

function compactMoney(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(value / 1000)}K`;
}

function TypeSplit({
  slices,
  city,
}: {
  slices: Array<{ name: string; count: number }>;
  city: string | null;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.count, 0) || 1;
  const pie = piePaths(slices.map((slice) => slice.count));

  return (
    <div className="rounded-2xl border border-line p-4 sm:p-5">
      <h3 className="mb-4 text-[15px] font-semibold text-ink">
        Property Type Distribution{city ? ` — ${city}` : ""}
      </h3>
      <div className="flex flex-col items-center gap-6 sm:flex-row">
        <svg viewBox="0 0 160 160" className="h-40 w-40 shrink-0" role="img" aria-label="Property type split">
          {pie.map((slice, index) => (
            <path key={slices[index]?.name ?? index} d={slice} fill={TYPE_COLORS[index % TYPE_COLORS.length]} />
          ))}
        </svg>
        <ul className="w-full flex-1 space-y-2.5">
          {slices.map((slice, index) => (
            <li key={slice.name} className="flex items-center gap-3 text-[13px]">
              <span
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ background: TYPE_COLORS[index % TYPE_COLORS.length] }}
              />
              <span className="min-w-0 flex-1 truncate text-ink">{slice.name}</span>
              <span className="font-semibold text-ink">{Math.round((slice.count / total) * 100)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function InsightList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h4 className="mb-2 text-[14px] font-semibold text-ink">{title}</h4>
      <ul className="space-y-1.5 text-[13px] text-ink-soft">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function CensusBlock({ census }: { census: CensusProfile }) {
  const tiles = [
    census.population > 0 ? { label: "Population", value: census.population.toLocaleString() } : null,
    census.medianAge > 0 ? { label: "Median age", value: String(census.medianAge) } : null,
    census.averageHouseholdSize > 0
      ? { label: "Avg. household", value: String(census.averageHouseholdSize) }
      : null,
    census.averageHouseholdIncome
      ? { label: "Avg. household income", value: census.averageHouseholdIncome }
      : null,
  ].filter((tile): tile is { label: string; value: string } => tile !== null);

  if (tiles.length === 0 && census.incomeDistribution.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line p-4 sm:p-5">
      <h3 className="mb-1 text-[18px] font-semibold text-ink">Census snapshot</h3>
      <p className="mb-4 text-[13px] text-ink-muted">Statistics Canada FSA profile for this postal code.</p>
      {tiles.length > 0 && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map((tile) => (
            <Stat key={tile.label} label={tile.label} value={tile.value} />
          ))}
        </div>
      )}
      {census.incomeDistribution.length > 0 && (
        <>
          <h4 className="mb-3 text-[14px] font-semibold text-ink">Household Income Distribution</h4>
          <ul className="space-y-2">
            {census.incomeDistribution.map((row) => (
              <li key={row.range} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 text-[12px]">
                <span className="text-ink-muted">{row.range}</span>
                <span className="h-2 overflow-hidden rounded-full bg-surface-alt">
                  <span className="block h-2 rounded-full bg-navy" style={{ width: `${Math.min(row.value, 100)}%` }} />
                </span>
                <span className="font-semibold">{row.value}%</span>
              </li>
            ))}
          </ul>
        </>
      )}
      {census.disclaimer && <p className="mt-3 text-[11px] text-ink-subtle">{census.disclaimer}</p>}
    </div>
  );
}
