import type { Metadata } from "next";
import { Suspense } from "react";
import { CommunitySelect } from "@/components/market/CommunitySelect";
import { SegmentBars, TrendChart } from "@/components/market/TrendChart";
import { WatchAreaButton } from "@/components/market/WatchAreaButton";
import { NavChip } from "@/components/navigation/NavChip";
import { PendingContent, PendingNavigationProvider } from "@/components/navigation/PendingNavigation";
import { InquiryForm } from "@/components/property/InquiryForm";
import { Eyebrow } from "@/components/ui/Badge";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { cn } from "@/lib/utils/cn";
import {
  getCatalogStats,
  getMarketTrends,
  getSoldTrends,
  MARKET_CITIES,
  MARKET_RANGES,
  SOLD_PROPERTY_TYPES,
  type SoldPropertyType,
  type SoldTrends,
} from "@/lib/api/market";
import { EMPTY, formatDate, formatPercent, formatPrice, formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Market trends",
  description:
    "Median sold prices, days on market and sale-to-list ratios by GTA city, community and property type, plus active listing prices.",
  alternates: { canonical: "/market-trends" },
};

export const revalidate = 1800;

type Filters = {
  city: (typeof MARKET_CITIES)[number];
  range: (typeof MARKET_RANGES)[number];
  type: SoldPropertyType | null;
  community: string | null;
};

const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** One URL builder for every control, so filters carry over consistently. */
function trendsHref(current: Filters, next: Partial<{ city: string; range: string; type: string | null; community: string | null }>) {
  const query = new URLSearchParams();
  const city = next.city ?? current.city;
  query.set("city", city);
  const range = next.range ?? current.range.key;
  if (range !== MARKET_RANGES[0].key) query.set("range", range);
  const type = next.type === undefined ? current.type : next.type;
  if (type) query.set("type", type);
  // A community belongs to one city: changing city drops it.
  const community = next.city && next.city !== current.city ? null : next.community === undefined ? current.community : next.community;
  if (community) query.set("community", community);
  return `/market-trends?${query}`;
}

/**
 * Market Trends (scope #9, HouseSigma's market trends page): city,
 * community, property type and a 1/2/3-year range, a Watch box and a Contact
 * Agent form. Community and type filter the SOLD market (TRREB), the only feed
 * that carries both; the active-listing figures below stay city-wide.
 */
export default async function MarketTrendsPage({ searchParams }: PageProps<"/market-trends">) {
  const params = await searchParams;
  const filters: Filters = {
    city: MARKET_CITIES.find((c) => c.toLowerCase() === first(params.city)?.toLowerCase()) ?? MARKET_CITIES[0],
    range: MARKET_RANGES.find((r) => r.key === first(params.range)) ?? MARKET_RANGES[0],
    type: SOLD_PROPERTY_TYPES.find((t) => t.key === first(params.type))?.key ?? null,
    community: first(params.community)?.trim().slice(0, 120) || null,
  };
  const areaLabel = filters.community ? `${filters.community}, ${filters.city}` : filters.city;

  return (
    <PendingNavigationProvider>
      <header className="border-b border-line bg-surface-alt py-8 sm:py-12">
        <div className="container-page">
          <Eyebrow>Market insights</Eyebrow>
          <h1 className="mt-3 text-h1 text-ink">GTA market trends</h1>
          <p className="mt-2 max-w-2xl text-small text-ink-muted">
            What homes are selling for, how fast, and against asking, by city, community and property type.
          </p>

          <nav aria-label="Select a city" className="mt-6 flex flex-wrap gap-2">
            {MARKET_CITIES.map((option) => (
              <NavChip key={option} href={trendsHref(filters, { city: option })} current={option === filters.city} scroll={false}>
                {option}
              </NavChip>
            ))}
          </nav>
          <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-3">
            <nav aria-label="Select a period" className="flex flex-wrap gap-2">
              {MARKET_RANGES.map((option) => (
                <NavChip
                  key={option.key}
                  href={trendsHref(filters, { range: option.key })}
                  current={option.key === filters.range.key}
                  scroll={false}
                >
                  {option.label}
                </NavChip>
              ))}
            </nav>
            <nav aria-label="Select a property type" className="flex flex-wrap gap-2">
              <NavChip href={trendsHref(filters, { type: null })} current={!filters.type} scroll={false}>
                All types
              </NavChip>
              {SOLD_PROPERTY_TYPES.map((option) => (
                <NavChip
                  key={option.key}
                  href={trendsHref(filters, { type: option.key })}
                  current={option.key === filters.type}
                  scroll={false}
                >
                  {option.label}
                </NavChip>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <div className="container-page grid gap-10 py-10 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <PendingContent fallback={<TrendsSkeleton />}>
            <Suspense
              key={`${filters.city}-${filters.range.key}-${filters.type}-${filters.community}`}
              fallback={<TrendsSkeleton />}
            >
              <CityTrends filters={filters} />
            </Suspense>
          </PendingContent>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28 lg:h-fit">
          <WatchAreaButton label={areaLabel} />
          <InquiryForm listingKey="" address={areaLabel} variant="market" />
        </aside>
      </div>
    </PendingNavigationProvider>
  );
}

async function CityTrends({ filters }: { filters: Filters }) {
  const { city, range, type, community } = filters;
  const filtered = Boolean(type || community);
  const [trends, stats, citySold, filteredSold] = await Promise.all([
    getMarketTrends({ city }, range.months).catch(() => null),
    getCatalogStats({ city }).catch(() => null),
    // Never throws: returns `unavailable` when the sold feed is down. The
    // city-wide call also supplies the community list (and is pre-warmed).
    getSoldTrends(city, range.months),
    filtered ? getSoldTrends(city, range.months, {}, { community: community ?? undefined, propertyType: type ?? undefined }) : null,
  ]);
  const sold = filteredSold ?? citySold;

  if (!trends && !stats && sold.unavailable) {
    return <ErrorState description={`We couldn't load market data for ${city}.`} />;
  }

  const communityHrefs: Record<string, string> = { "": trendsHref(filters, { community: null }) };
  for (const option of citySold.communities) communityHrefs[option.name] = trendsHref(filters, { community: option.name });
  // Keep a community from the URL selectable even if it has no sales in range.
  const communities =
    community && !citySold.communities.some((c) => c.name === community)
      ? [{ name: community, unitsSold: 0 }, ...citySold.communities]
      : citySold.communities;
  if (community) communityHrefs[community] ??= trendsHref(filters, { community });

  const typeLabel = SOLD_PROPERTY_TYPES.find((t) => t.key === type)?.label ?? null;
  const soldTitle = [community ?? city, typeLabel].filter(Boolean).join(" · ");

  const series = trends?.series ?? [];
  const withPrices = series.filter((point) => point.medianListPrice !== null);
  const firstValue = withPrices[0]?.medianListPrice ?? null;
  const lastValue = withPrices[withPrices.length - 1]?.medianListPrice ?? null;
  const changePct =
    firstValue && lastValue && firstValue > 0 ? ((lastValue - firstValue) / firstValue) * 100 : null;

  return (
    <div className="space-y-10">
      {communities.length > 0 && (
        <CommunitySelect communities={communities} value={community} hrefFor={communityHrefs} />
      )}

      <SoldMarket sold={sold} title={soldTitle} rangeLabel={range.label} />

      <section className="space-y-6">
        <div>
          <h2 className="text-h2 text-ink">Active listings · {city}</h2>
          <p className="mt-1 text-caption text-ink-muted">
            All property types in the city{community || type ? " (community and type filters apply to sold data above)" : ""}.
          </p>
        </div>
        <dl className="grid gap-px overflow-hidden rounded-surface border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Median list price" value={stats?.medianListPrice ? formatPrice(stats.medianListPrice) : EMPTY} />
          <Stat
            label="Median $/sq ft"
            value={stats?.medianPricePerSqft ? formatPrice(Math.round(stats.medianPricePerSqft)) : EMPTY}
          />
          <Stat
            label="Active listings"
            value={
              trends?.activeCurrent !== null && trends?.activeCurrent !== undefined
                ? formatNumber(trends.activeCurrent)
                : stats
                  ? formatNumber(stats.sampleSize)
                  : EMPTY
            }
          />
          <Stat
            label={`${trends?.windowMonths ?? range.months}-month list price change`}
            value={changePct === null ? EMPTY : formatPercent(changePct)}
            tone={changePct === null ? undefined : changePct >= 0 ? "positive" : "negative"}
          />
        </dl>

        <div className="rounded-surface border border-line bg-surface p-6">
          <h3 className="text-h3 text-ink">Median list price</h3>
          <p className="mt-1 text-caption text-ink-muted">Last {trends?.windowMonths ?? range.months} months</p>
          <div className="mt-6">
            <TrendChart
              label="Median list price"
              detailLabel="New listings"
              series={series.map((point) => ({ month: point.month, value: point.medianListPrice, detail: point.newListings }))}
            />
          </div>
        </div>

        {(trends?.byBedrooms.length || trends?.bySubtype.length) && (
          <div className="grid gap-8 rounded-surface border border-line bg-surface p-6 sm:grid-cols-2">
            <SegmentBars data={trends?.byBedrooms ?? []} label="By bedrooms" />
            <SegmentBars data={trends?.bySubtype ?? []} label="By property type" />
          </div>
        )}
      </section>

      {/*
        The backend's own disclaimer, shown verbatim. It scopes the ACTIVE
        listing figures; the sold section carries its own attribution.
      */}
      {(trends?.disclaimer ?? stats?.disclaimer) && (
        <section className="rounded-surface border border-gold/30 bg-gold-soft p-5">
          <h2 className="text-h3 text-ink">About this data</h2>
          <p className="mt-2 text-small text-ink-soft">{trends?.disclaimer ?? stats?.disclaimer}</p>
        </section>
      )}
    </div>
  );
}

/**
 * Closed-sale figures (API_GAPS G3). This is a different population from every
 * chart above — asking prices there, achieved prices here — so it is rendered
 * as its own section with its own attribution rather than folded into them.
 *
 * Three states, all honest: upstream unavailable, no sales recorded in the
 * window, or the table. We never show an empty chart, which would read as
 * "nothing sold" when it actually means "we couldn't ask".
 */
function SoldMarket({ sold, title, rangeLabel }: { sold: SoldTrends; title: string; rangeLabel: string }) {
  if (sold.unavailable) {
    return (
      <section className="rounded-surface border border-line bg-surface p-6">
        <h2 className="text-h2 text-ink">Sold market · {title}</h2>
        <p className="mt-2 text-small text-ink-muted">
          Sold-transaction data is temporarily unavailable. Median sold price,
          days on market and sale-to-list ratio will appear here once the
          connection to the sold feed is restored.
        </p>
      </section>
    );
  }

  const months = sold.months.filter((m) => m.unitsSold > 0);
  if (months.length === 0) {
    return (
      <section className="rounded-surface border border-line bg-surface p-6">
        <h2 className="text-h2 text-ink">Sold market · {title}</h2>
        <p className="mt-2 text-small text-ink-muted">
          No closed sales were recorded for {title} in the last {rangeLabel}.
        </p>
      </section>
    );
  }

  // Newest first reads better in a table than the chronological chart order.
  const rows = [...months].reverse();
  const latest = rows[0];
  // HouseSigma's "value change": median sold price, first month vs latest.
  const earliest = months[0];
  const valueChange =
    earliest.medianSoldPrice && latest.medianSoldPrice && months.length > 1
      ? ((latest.medianSoldPrice - earliest.medianSoldPrice) / earliest.medianSoldPrice) * 100
      : null;

  return (
    <section className="rounded-surface border border-line bg-surface p-6">
      <h2 className="text-h2 text-ink">Sold market · {title}</h2>
      <p className="mt-1 text-caption text-ink-muted">
        Closed transactions, last {sold.windowMonths} months
        {sold.generatedAt && <> · as of {formatDate(sold.generatedAt)}</>}
        {sold.stale && " · the sold feed is not responding, so these may be a few hours old"}
      </p>

      <dl className="mt-6 grid gap-px overflow-hidden rounded-surface border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        <Stat
          label="Median sold price"
          value={latest.medianSoldPrice ? formatPrice(latest.medianSoldPrice) : EMPTY}
        />
        <Stat
          label={`Change over ${rangeLabel}`}
          value={valueChange === null ? EMPTY : formatPercent(valueChange)}
          tone={valueChange === null ? undefined : valueChange >= 0 ? "positive" : "negative"}
        />
        <Stat
          label="Avg. days on market"
          value={
            latest.avgDaysOnMarket === null
              ? EMPTY
              : `${Math.round(latest.avgDaysOnMarket)} days`
          }
        />
        <Stat
          label="Sale-to-list ratio"
          value={
            latest.saleToListRatio === null
              ? EMPTY
              : `${(latest.saleToListRatio * 100).toFixed(1)}%`
          }
          tone={
            latest.saleToListRatio === null
              ? undefined
              : latest.saleToListRatio >= 1
                ? "positive"
                : "negative"
          }
        />
      </dl>

      <div className="mt-6">
        <h3 className="sr-only">Median sold price by month</h3>
        <TrendChart
          label="Median sold price"
          detailLabel="Units sold"
          series={months.map((m) => ({ month: m.month, value: m.medianSoldPrice, detail: m.unitsSold }))}
        />
      </div>

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-small">
          <caption className="sr-only">
            Monthly closed-sale statistics for {title}
          </caption>
          <thead>
            <tr className="border-b border-line text-left text-caption text-ink-muted">
              <th scope="col" className="py-2 pr-4 font-medium">Month</th>
              <th scope="col" className="py-2 pr-4 font-medium">Median sold</th>
              <th scope="col" className="py-2 pr-4 font-medium">Days on market</th>
              <th scope="col" className="py-2 pr-4 font-medium">Sale-to-list</th>
              <th scope="col" className="py-2 font-medium">Units sold</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="border-b border-line/60 last:border-0">
                <th scope="row" className="py-2 pr-4 font-normal text-ink">
                  {row.month}
                </th>
                <td className="py-2 pr-4 text-ink">
                  {row.medianSoldPrice ? formatPrice(row.medianSoldPrice) : EMPTY}
                </td>
                <td className="py-2 pr-4 text-ink-soft">
                  {row.avgDaysOnMarket === null
                    ? EMPTY
                    : Math.round(row.avgDaysOnMarket)}
                </td>
                <td className="py-2 pr-4 text-ink-soft">
                  {row.saleToListRatio === null
                    ? EMPTY
                    : `${(row.saleToListRatio * 100).toFixed(1)}%`}
                </td>
                <td className="py-2 text-ink-soft">{formatNumber(row.unitsSold)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-caption text-ink-muted">
        Source: TRREB closed transactions. Figures cover sales reported to the
        board and may be revised as late filings arrive.
      </p>
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "positive" | "negative";
}) {
  return (
    <div className="bg-surface px-5 py-5">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd
        className={cn(
          "mt-1 text-h2",
          tone === "positive" && "text-positive",
          tone === "negative" && "text-negative",
          !tone && "text-ink",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function TrendsSkeleton() {
  return (
    <div className="space-y-10" role="status" aria-label="Loading market data">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
