/**
 * Market data.
 *
 * Two DIFFERENT populations live in this file — do not mix them in one chart:
 *
 * 1. `trends/` and `catalog-stats/` are derived from ACTIVE listings in this
 *    catalogue — asking prices, not sales. The backend returns its own
 *    disclaimer saying so and we render it verbatim. Both REQUIRE a `city` or
 *    3-letter `fsa`.
 * 2. `market/sold-trends/` (added for API_GAPS G3) is real CLOSED transactions
 *    from the AMPRE/TRREB feed, and is the only source here for sold price,
 *    days-on-market and sale-to-list ratio.
 *
 * `catalog-stats/bulk/` (G4) covers many cities in one call, and
 * `stats/platform/` (G13) carries the only sourced platform-wide figures.
 */

import { apiFetch, type RequestOptions } from "@/lib/api/client";
import type { BackendCatalogStats } from "@/lib/types/backend";
import type { CityCatalogStat, PlatformStats } from "@/lib/types/domain";

const MLS = "/api/mls";

/** Cities the trends page offers. The backend matches `city` case-insensitively. */
export const MARKET_CITIES = [
  "Toronto",
  "Mississauga",
  "Vaughan",
  "Markham",
  "Brampton",
  "Oakville",
  "Burlington",
  "Hamilton",
] as const;

export interface TrendPoint {
  month: string;
  medianListPrice: number | null;
  meanListPrice: number | null;
  medianPricePerSqft: number | null;
  newListings: number;
}

export interface SegmentSlice {
  name: string;
  count: number;
}

export interface MarketTrends {
  city: string | null;
  windowMonths: number;
  series: TrendPoint[];
  byBedrooms: SegmentSlice[];
  bySubtype: SegmentSlice[];
  sampleSize: number;
  activeCurrent: number | null;
  /** Percentage of rows carrying an interior area, i.e. how solid $/sqft is. */
  pctWithLivingArea: number | null;
  disclaimer: string;
}

interface RawTrends {
  scope?: { city?: string | null; fsa?: string | null };
  window_months?: number;
  series?: Array<Record<string, unknown>>;
  segmentation?: {
    by_bedrooms?: SegmentSlice[];
    by_subtype?: SegmentSlice[];
  };
  subtype_distribution?: SegmentSlice[];
  sample_size?: number;
  velocity?: { active_current?: number };
  confidence?: { pct_with_living_area?: number };
  disclaimer?: string;
}

const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

export async function getMarketTrends(
  scope: { city?: string; fsa?: string },
  windowMonths = 12,
  options: RequestOptions = {},
): Promise<MarketTrends> {
  const data = await apiFetch<RawTrends>(`${MLS}/trends/`, {
    revalidate: 1800,
    ...options,
    params: {
      city: scope.city,
      fsa: scope.fsa,
      window: `${windowMonths}m`,
    },
  });

  return {
    city: data.scope?.city ?? scope.city ?? null,
    windowMonths: data.window_months ?? windowMonths,
    series: (data.series ?? []).map((point) => ({
      month: String(point.month ?? ""),
      medianListPrice: num(point.median_list_price),
      meanListPrice: num(point.mean_list_price),
      medianPricePerSqft: num(point.median_price_per_sqft),
      newListings: num(point.new_listings) ?? 0,
    })),
    byBedrooms: data.segmentation?.by_bedrooms ?? [],
    bySubtype: data.segmentation?.by_subtype ?? data.subtype_distribution ?? [],
    sampleSize: data.sample_size ?? 0,
    activeCurrent: num(data.velocity?.active_current),
    pctWithLivingArea: num(data.confidence?.pct_with_living_area),
    disclaimer:
      data.disclaimer ??
      "Based on active listings in this catalogue only; not sold-market statistics.",
  };
}

export interface CatalogStats {
  city: string | null;
  sampleSize: number;
  medianListPrice: number | null;
  meanListPrice: number | null;
  minListPrice: number | null;
  maxListPrice: number | null;
  medianPricePerSqft: number | null;
  disclaimer: string;
}

export async function getCatalogStats(
  scope: { city?: string; fsa?: string },
  options: RequestOptions = {},
): Promise<CatalogStats> {
  const data = await apiFetch<BackendCatalogStats>(`${MLS}/catalog-stats/`, {
    revalidate: 1800,
    ...options,
    params: { city: scope.city, fsa: scope.fsa },
  });

  return {
    city: data.scope?.city ?? scope.city ?? null,
    sampleSize: data.sample_size ?? 0,
    medianListPrice: data.median_list_price,
    meanListPrice: data.mean_list_price,
    minListPrice: data.min_list_price,
    maxListPrice: data.max_list_price,
    medianPricePerSqft: data.median_price_per_sqft,
    disclaimer: data.disclaimer,
  };
}

/* -------------------------------------------------------------------------- */
/* Sold market (API_GAPS G3)                                                   */
/* -------------------------------------------------------------------------- */

/**
 * `market/sold-trends/` — the first real SOLD data in the app. Unlike `trends/`
 * above, these are closed transactions (median close price, days on market,
 * sale-to-list ratio), pulled by the backend from the AMPRE/TRREB OData feed.
 *
 * Every metric is nullable per month: a month with too few closings yields null
 * rather than a misleading figure, and the UI renders "—" for it.
 */
export interface SoldTrendPoint {
  month: string;
  medianSoldPrice: number | null;
  avgDaysOnMarket: number | null;
  /** Ratio, e.g. 1.024 = sold 2.4% over asking. Not a percentage. */
  saleToListRatio: number | null;
  unitsSold: number;
}

export interface SoldTrends {
  city: string;
  windowMonths: number;
  months: SoldTrendPoint[];
  /**
   * Set when the upstream sold feed could not be reached. The page renders a
   * plain unavailable state instead of an empty chart that reads as "no sales".
   */
  unavailable: boolean;
}

/**
 * Returns `unavailable: true` rather than throwing when the AMPRE upstream
 * fails (the backend surfaces that as a 502). Sold data is a supplementary
 * panel on a page whose list-price charts still work, so an upstream outage
 * must degrade that panel, not the page.
 */
export async function getSoldTrends(
  city: string,
  windowMonths = 12,
  options: RequestOptions = {},
): Promise<SoldTrends> {
  const empty: SoldTrends = {
    city,
    windowMonths,
    months: [],
    unavailable: true,
  };
  if (!city.trim()) return empty;

  try {
    const data = await apiFetch<{
      city?: string;
      window_months?: number;
      months?: Array<Record<string, unknown>>;
    }>(`${MLS}/market/sold-trends/`, {
      revalidate: 1800,
      ...options,
      params: { city, window: `${windowMonths}m` },
    });

    return {
      city: data.city ?? city,
      windowMonths: data.window_months ?? windowMonths,
      months: (data.months ?? []).map((row) => ({
        month: String(row.month ?? ""),
        medianSoldPrice: num(row.median_sold_price),
        avgDaysOnMarket: num(row.avg_days_on_market),
        saleToListRatio: num(row.sale_to_list_ratio),
        unitsSold: num(row.units_sold) ?? 0,
      })),
      unavailable: false,
    };
  } catch {
    return empty;
  }
}

/* -------------------------------------------------------------------------- */
/* Bulk city stats (API_GAPS G4)                                               */
/* -------------------------------------------------------------------------- */

/**
 * `catalog-stats/bulk/` — replaces the N-parallel-requests fan-out the
 * communities grid used to do. One request covers every city.
 */
export async function getBulkCatalogStats(
  scope: { cities?: string[]; gta?: boolean; includeSold?: boolean },
  options: RequestOptions = {},
): Promise<CityCatalogStat[]> {
  const params = {
    ...(scope.gta ? { scope: "gta" } : { cities: (scope.cities ?? []).join(",") }),
    // The sold summary is a separate AMPRE query; callers that don't show it skip it.
    include_sold: scope.includeSold === false ? "false" : undefined,
  };
  if (!scope.gta && !(scope.cities ?? []).length) return [];

  const data = await apiFetch<{
    results?: Array<{
      city?: string;
      active_count?: number;
      median_list_price?: number | null;
      mean_list_price?: number | null;
      sold_count_90d?: number | null;
      avg_sold_price_90d?: number | null;
      median_sold_price_90d?: number | null;
    }>;
  }>(`${MLS}/catalog-stats/bulk/`, { revalidate: 900, ...options, params });

  return (data.results ?? []).map((row) => ({
    city: row.city ?? "",
    activeCount: row.active_count ?? 0,
    medianListPrice: num(row.median_list_price),
    meanListPrice: num(row.mean_list_price),
    soldCount90d: num(row.sold_count_90d),
    avgSoldPrice90d: num(row.avg_sold_price_90d),
    medianSoldPrice90d: num(row.median_sold_price_90d),
  }));
}

/* -------------------------------------------------------------------------- */
/* Platform stats (API_GAPS G13)                                               */
/* -------------------------------------------------------------------------- */

/**
 * `stats/platform/` — the ONLY sourced platform figures. The reference's
 * "Trusted by 12,000+ homeowners" was invented; these are counted from the
 * database, so they may be quoted. Returns null on failure so callers omit the
 * claim entirely rather than falling back to a guess.
 *
 * `registeredUsers` is a raw account count on a young install (13 at the time
 * of writing) — quote `activeListings` in marketing copy, not this.
 */
export async function getPlatformStats(
  options: RequestOptions = {},
): Promise<PlatformStats | null> {
  try {
    const data = await apiFetch<{
      registered_users?: number;
      active_listings?: number;
      inquiries_last_30d?: number;
      generated_at?: string;
    }>(`${MLS}/stats/platform/`, { revalidate: 600, ...options });
    return {
      registeredUsers: data.registered_users ?? 0,
      activeListings: data.active_listings ?? 0,
      inquiriesLast30d: data.inquiries_last_30d ?? 0,
      generatedAt: data.generated_at ?? null,
    };
  } catch {
    return null;
  }
}
