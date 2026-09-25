import type { Metadata } from "next";
import { Suspense } from "react";
import { NavChip } from "@/components/navigation/NavChip";
import { PendingContent, PendingNavigationProvider } from "@/components/navigation/PendingNavigation";
import { SegmentBars, TrendChart } from "@/components/market/TrendChart";
import { Eyebrow } from "@/components/ui/Badge";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { cn } from "@/lib/utils/cn";
import {
  getCatalogStats,
  getMarketTrends,
  getSoldTrends,
  MARKET_CITIES,
  type SoldTrends,
} from "@/lib/api/market";
import { EMPTY, formatPercent, formatPrice, formatNumber } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Market trends",
  description:
    "Track listing prices, inventory and property mix across Greater Toronto Area cities.",
  alternates: { canonical: "/market-trends" },
};

export const revalidate = 1800;

export default async function MarketTrendsPage({
  searchParams,
}: PageProps<"/market-trends">) {
  const params = await searchParams;
  const raw = Array.isArray(params.city) ? params.city[0] : params.city;
  const city = MARKET_CITIES.find((c) => c.toLowerCase() === raw?.toLowerCase())
    ?? MARKET_CITIES[0];

  // City chips select on click; the figures show a skeleton while the new
  // city loads (PendingNavigation).
  return (
    <PendingNavigationProvider>
      <header className="border-b border-line bg-surface-alt py-8 sm:py-12">
        <div className="container-page">
          <Eyebrow>Market insights</Eyebrow>
          <h1 className="mt-3 text-h1 text-ink">GTA market trends</h1>
          <p className="mt-2 max-w-2xl text-small text-ink-muted">
            Listing activity and pricing by city, updated as new listings arrive.
          </p>

          <nav aria-label="Select a city" className="mt-6 flex flex-wrap gap-2">
            {MARKET_CITIES.map((option) => (
              <NavChip
                key={option}
                href={`/market-trends?city=${encodeURIComponent(option)}`}
                current={option === city}
                scroll={false}
              >
                {option}
              </NavChip>
            ))}
          </nav>
        </div>
      </header>

      <div className="container-page py-10">
        <PendingContent fallback={<TrendsSkeleton />}>
          <Suspense key={city} fallback={<TrendsSkeleton />}>
            <CityTrends city={city} />
          </Suspense>
        </PendingContent>
      </div>
    </PendingNavigationProvider>
  );
}

async function CityTrends({ city }: { city: string }) {
  const [trends, stats, sold] = await Promise.all([
    getMarketTrends({ city }).catch(() => null),
    getCatalogStats({ city }).catch(() => null),
    // Never throws: returns `unavailable` when the sold feed is down.
    getSoldTrends(city),
  ]);

  if (!trends && !stats) {
    return <ErrorState description={`We couldn't load market data for ${city}.`} />;
  }

  const series = trends?.series ?? [];
  const withPrices = series.filter((point) => point.medianListPrice !== null);
  const firstValue = withPrices[0]?.medianListPrice ?? null;
  const lastValue = withPrices[withPrices.length - 1]?.medianListPrice ?? null;
  const changePct =
    firstValue && lastValue && firstValue > 0
      ? ((lastValue - firstValue) / firstValue) * 100
      : null;

  return (
    <div className="space-y-10">
      <section>
        <h2 className="sr-only">Key figures for {city}</h2>
        <dl className="grid gap-px overflow-hidden rounded-surface border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            label="Median list price"
            value={stats?.medianListPrice ? formatPrice(stats.medianListPrice) : EMPTY}
          />
          <Stat
            label="Median $/sq ft"
            value={
              stats?.medianPricePerSqft
                ? formatPrice(Math.round(stats.medianPricePerSqft))
                : EMPTY
            }
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
            label={`${trends?.windowMonths ?? 12}-month change`}
            value={changePct === null ? EMPTY : formatPercent(changePct)}
            tone={changePct === null ? undefined : changePct >= 0 ? "positive" : "negative"}
          />
        </dl>
      </section>

      <section className="rounded-surface border border-line bg-surface p-6">
        <h2 className="text-h2 text-ink">Median list price · {city}</h2>
        <p className="mt-1 text-caption text-ink-muted">
          Last {trends?.windowMonths ?? 12} months
        </p>
        <div className="mt-6">
          <TrendChart series={series} />
        </div>
      </section>

      {(trends?.byBedrooms.length || trends?.bySubtype.length) && (
        <section className="grid gap-8 rounded-surface border border-line bg-surface p-6 sm:grid-cols-2">
          <SegmentBars data={trends?.byBedrooms ?? []} label="By bedrooms" />
          <SegmentBars data={trends?.bySubtype ?? []} label="By property type" />
        </section>
      )}

      <SoldMarket sold={sold} city={city} />

      {/*
        The backend's own disclaimer, shown verbatim. It scopes the charts ABOVE
        this line, which describe active listings. The sold panel is a separate
        population and carries its own attribution (API_GAPS G3).
      */}
      <section className="rounded-surface border border-gold/30 bg-gold-soft p-5">
        <h2 className="text-h3 text-ink">About this data</h2>
        <p className="mt-2 text-small text-ink-soft">
          {trends?.disclaimer ?? stats?.disclaimer}
        </p>
      </section>
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
function SoldMarket({ sold, city }: { sold: SoldTrends; city: string }) {
  if (sold.unavailable) {
    return (
      <section className="rounded-surface border border-line bg-surface p-6">
        <h2 className="text-h2 text-ink">Sold market · {city}</h2>
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
        <h2 className="text-h2 text-ink">Sold market · {city}</h2>
        <p className="mt-2 text-small text-ink-muted">
          No closed sales were recorded for {city} in the last{" "}
          {sold.windowMonths} months.
        </p>
      </section>
    );
  }

  // Newest first reads better in a table than the chronological chart order.
  const rows = [...months].reverse();
  const latest = rows[0];

  return (
    <section className="rounded-surface border border-line bg-surface p-6">
      <h2 className="text-h2 text-ink">Sold market · {city}</h2>
      <p className="mt-1 text-caption text-ink-muted">
        Closed transactions, last {sold.windowMonths} months
      </p>

      <dl className="mt-6 grid gap-px overflow-hidden rounded-surface border border-line bg-line sm:grid-cols-3">
        <Stat
          label="Median sold price"
          value={latest.medianSoldPrice ? formatPrice(latest.medianSoldPrice) : EMPTY}
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

      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-small">
          <caption className="sr-only">
            Monthly closed-sale statistics for {city}
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
