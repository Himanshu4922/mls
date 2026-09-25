/**
 * Property search, detail and compare.
 *
 * Backend filter support (API_GAPS G1) landed in mls-v2 `PropertyFilterView`:
 * `price_min`/`price_max`, `beds_min`, `baths_min`, `sqft_min`/`sqft_max`,
 * `year_built_min` and a repeatable `property_sub_type` are now applied in SQL,
 * so those queries are exact, fully paginated and no longer window-capped.
 *
 * ONE filter is still applied client-side: property TYPE. The UI offers six
 * canonical types (Detached, Condo, Townhome…) but this feed's
 * `property_sub_type` column does not carry them — 4,114 of 4,622 rows are the
 * single value "Single Family" (verified against `properties/facets/`). Passing
 * a UI type straight through as `property_sub_type=Condo Apartment` matches
 * zero rows, which would render an empty market as if it were the truth. So we
 * keep the windowed client-side match for type only, and the UI discloses it.
 * Remove `TYPE_NEEDS_CLIENT_FILTER` once the feed carries granular sub-types.
 */

import { apiFetch, type RequestOptions } from "@/lib/api/client";
import { mapPropertyDetail, mapPropertySummary, mapPropertyTypeFacet, matchesUiType } from "@/lib/api/mappers";
import { backendStatusGroup, type BackendStatusGroup } from "@/lib/utils/status";
import type {
  BackendListResponse,
  BackendPropertyDetail,
  BackendPropertySummary,
  BackendPropertyTypeFacet,
} from "@/lib/types/backend";
import type {
  ListingQuery,
  ListingSort,
  Paginated,
  PropertyDetail,
  PropertyFacets,
  PropertySummary,
  PropertyTypeFacet,
} from "@/lib/types/domain";

const MLS = "/api/mls";

/** Max rows we will pull when emulating an unsupported filter client-side. */
const CLIENT_FILTER_WINDOW = 300;
/** Backend caps `limit` at 100. */
const MAX_PAGE_SIZE = 100;

/**
 * Type is the only filter the backend cannot express against this feed.
 * See the file header — flipping this to `false` is the whole rollback.
 */
const TYPE_NEEDS_CLIENT_FILTER = true;

export const SORT_TO_ORDERBY: Record<ListingSort, string> = {
  // Backend ranks by similarity to `semantic` (AI search's "Best match").
  relevance: "relevance",
  newest: "-modification_timestamp",
  "price-asc": "list_price",
  "price-desc": "-list_price",
  "beds-desc": "-bedrooms_total",
  "sqft-desc": "-building_area_total",
};

/** True when the query uses a filter the backend cannot express. */
function needsClientFiltering(query: ListingQuery): boolean {
  return TYPE_NEEDS_CLIENT_FILTER && Boolean(query.type);
}

function applyClientFilters(items: PropertySummary[], query: ListingQuery): PropertySummary[] {
  if (!query.type) return items;
  return items.filter((item) => matchesUiType(item.type, query.type!));
}

/**
 * ListingQuery → `properties/filter/` params. Exported because it is the ONE
 * translation: the map route and saved searches (whose `filters_json` stores
 * exactly this, minus paging) reuse it rather than re-deriving the mapping.
 */
export function toBackendParams(query: ListingQuery, limit?: number, offset?: number) {
  // The backend's fallback pipeline relaxes city, then tries nearby cities,
  // then returns the WHOLE catalogue when nothing matches. For a postal code
  // or an open-house search that is actively wrong — "L7A" with no homes must
  // read as zero, not as a page of Toronto listings that look like matches.
  // Status tabs select a GROUP ("Sold" also matches "Closed"/"Leased"). Sold
  // and De-listed are strict too: this feed has almost none, and the fallback
  // would otherwise answer an empty Sold tab with every active listing.
  const group = backendStatusGroup(query.status);
  const strict = Boolean(
    query.postalCodes?.length || query.openHouse || (group && group !== "active"),
  );
  return {
    limit,
    offset,
    search: query.search,
    city: query.city,
    status: group ? undefined : query.status,
    status_group: group ?? undefined,
    transaction_type: query.transaction,
    has_lease: query.hasLease ? "true" : undefined,
    orderby: SORT_TO_ORDERBY[query.sort === "relevance" && !query.semantic ? "newest" : (query.sort ?? "newest")],
    semantic: query.semantic,
    // Server-side since G1 — exact counts, no window cap.
    price_min: query.priceMin,
    price_max: query.priceMax,
    beds_min: query.bedsMin,
    baths_min: query.bathsMin,
    sqft_min: query.sqftMin,
    sqft_max: query.sqftMax,
    year_built_min: query.yearBuiltMin,
    // Repeatable: buildQuery() appends one key per entry, which DRF reads via
    // getlist(). Only sent when the caller passes real feed values.
    property_sub_type: query.propertySubTypes?.length ? query.propertySubTypes : undefined,
    lat_min: query.bounds?.latMin,
    lat_max: query.bounds?.latMax,
    lng_min: query.bounds?.lngMin,
    lng_max: query.bounds?.lngMax,
    polygon: query.polygon ? JSON.stringify(query.polygon) : undefined,
    // Backend normalises spaces/case; FSAs prefix-match, full codes are exact.
    postal_code: query.postalCodes?.length ? query.postalCodes.join(",") : undefined,
    has_open_house: query.openHouse ? "1" : undefined,
    allow_fallback: strict ? "false" : undefined,
  };
}

export interface ListingsResult extends Paginated<PropertySummary> {
  /**
   * True when unsupported filters forced client-side filtering, so `total` is a
   * count within the fetched window rather than the full result set.
   */
  approximate: boolean;
  /** True when the client-side window was exhausted and results may be missing. */
  truncated: boolean;
}

export async function searchProperties(
  query: ListingQuery = {},
  options: RequestOptions = {},
): Promise<ListingsResult> {
  const pageSize = Math.min(query.limit ?? 12, MAX_PAGE_SIZE);
  const offset = query.offset ?? 0;

  if (!needsClientFiltering(query)) {
    const data = await apiFetch<BackendListResponse<BackendPropertySummary>>(
      `${MLS}/properties/filter/`,
      { ...options, params: toBackendParams(query, pageSize, offset) },
    );
    return {
      items: (data.results ?? []).map(mapPropertySummary),
      total: data.count ?? 0,
      nextOffset: data.next,
      previousOffset: data.previous,
      approximate: false,
      truncated: false,
    };
  }

  // Type filter only: every OTHER filter still narrows the query server-side
  // first, so the window we scan is already as small as the backend can make it.
  const data = await apiFetch<BackendListResponse<BackendPropertySummary>>(
    `${MLS}/properties/filter/`,
    { ...options, params: toBackendParams(query, MAX_PAGE_SIZE, 0) },
  );

  const first = (data.results ?? []).map(mapPropertySummary);
  const available = Math.min(data.count ?? 0, CLIENT_FILTER_WINDOW);

  // Fetch the remaining window pages CONCURRENTLY. Serially these were three
  // round-trips stacked inside one render, which blew the client's 15s timeout
  // and failed the page outright — a parallel fan-out costs one round-trip.
  const offsets: number[] = [];
  for (let at = first.length; at < available; at += MAX_PAGE_SIZE) {
    offsets.push(at);
  }

  const pages = await Promise.all(
    offsets.map((at) =>
      apiFetch<BackendListResponse<BackendPropertySummary>>(
        `${MLS}/properties/filter/`,
        { ...options, params: toBackendParams(query, MAX_PAGE_SIZE, at) },
      )
        .then((page) => (page.results ?? []).map(mapPropertySummary))
        // One slow page must not fail the whole grid; it only narrows the
        // window, which `truncated` already discloses.
        .catch(() => [] as PropertySummary[]),
    ),
  );

  const pool = first.concat(...pages);
  const fetched = pool.length;

  const filtered = applyClientFilters(pool, query);
  const page = filtered.slice(offset, offset + pageSize);

  return {
    items: page,
    total: filtered.length,
    nextOffset: offset + pageSize < filtered.length ? offset + pageSize : null,
    previousOffset: offset > 0 ? Math.max(0, offset - pageSize) : null,
    approximate: true,
    truncated: (data.count ?? 0) > fetched,
  };
}

/**
 * GET properties/facets/ — counts per status, sub-type and price bucket for the
 * current filter set (API_GAPS G2). Powers the listings status tabs.
 *
 * The backend deliberately ignores `search` and `polygon` here so facet counts
 * stay consistent with the paginated query, so we don't send them either.
 * A facet strip is decoration: a failure returns null and the tabs hide rather
 * than taking down the results grid.
 */
export async function getPropertyFacets(
  query: ListingQuery = {},
  options: RequestOptions = {},
): Promise<PropertyFacets | null> {
  try {
    const data = await apiFetch<{
      status?: Record<string, number>;
      status_group?: Partial<Record<BackendStatusGroup, number>>;
      property_sub_type?: Record<string, number>;
      price_buckets?: Array<{ min: number; max: number | null; count: number }>;
      open_house?: number;
    }>(`${MLS}/properties/facets/`, {
      revalidate: 300,
      ...options,
      params: {
        city: query.city,
        status: query.status,
        transaction_type: query.transaction,
        has_lease: query.hasLease ? "true" : undefined,
        price_min: query.priceMin,
        price_max: query.priceMax,
        beds_min: query.bedsMin,
        baths_min: query.bathsMin,
        sqft_min: query.sqftMin,
        sqft_max: query.sqftMax,
        year_built_min: query.yearBuiltMin,
        property_sub_type: query.propertySubTypes?.length
          ? query.propertySubTypes
          : undefined,
        postal_code: query.postalCodes?.length ? query.postalCodes.join(",") : undefined,
      },
    });
    return {
      status: data.status ?? {},
      // Older backends omit it; null keeps the tabs but drops their counts.
      statusGroup: data.status_group ?? null,
      propertySubType: data.property_sub_type ?? {},
      priceBuckets: data.price_buckets ?? [],
      // Older backends omit it; null hides the tab rather than showing "0".
      openHouse: typeof data.open_house === "number" ? data.open_house : null,
    };
  } catch {
    return null;
  }
}

export async function getProperty(
  listingKey: string,
  options: RequestOptions = {},
): Promise<PropertyDetail> {
  const data = await apiFetch<BackendPropertyDetail>(
    `${MLS}/properties/${encodeURIComponent(listingKey)}/`,
    options,
  );
  return mapPropertyDetail(data);
}

/** GET properties/compare/?listing_key=A&listing_key=B */
export async function compareProperties(
  listingKeys: string[],
  options: RequestOptions = {},
): Promise<PropertyDetail[]> {
  if (listingKeys.length === 0) return [];
  const data = await apiFetch<BackendPropertyDetail[]>(`${MLS}/properties/compare/`, {
    ...options,
    params: { listing_key: listingKeys },
  });
  return (data ?? []).map(mapPropertyDetail);
}

export async function getPropertyTypes(
  options: RequestOptions = {},
): Promise<PropertyTypeFacet[]> {
  const data = await apiFetch<{ results: BackendPropertyTypeFacet[] }>(
    `${MLS}/properties/property-types/`,
    { revalidate: 3600, ...options },
  );
  return (data.results ?? []).map(mapPropertyTypeFacet);
}

/** Curated rails used on the home page. */
export async function getNewlyListed(
  limit = 8,
  options: RequestOptions = {},
): Promise<PropertySummary[]> {
  const data = await apiFetch<BackendListResponse<BackendPropertySummary>>(
    `${MLS}/properties/newly-listed-properties/`,
    { revalidate: 600, ...options, params: { limit, ...options.params } },
  );
  return (data.results ?? []).map(mapPropertySummary);
}

/**
 * Home "Featured" rail: listings an admin pinned (`is_featured`, in
 * `featured_order`) first, topped up by the backend with exclusive listings.
 * `pinnedCount` says how many of the rows were hand-picked.
 */
export async function getFeaturedProperties(
  limit = 6,
  options: RequestOptions = {},
): Promise<{ listings: PropertySummary[]; pinnedCount: number }> {
  const data = await apiFetch<
    BackendListResponse<BackendPropertySummary> & { pinned_count?: number }
  >(`${MLS}/properties/featured-properties/`, {
    revalidate: 300,
    ...options,
    params: { limit, ...options.params },
  });
  return {
    listings: (data.results ?? []).map(mapPropertySummary),
    pinnedCount: data.pinned_count ?? 0,
  };
}

export async function getExclusiveProperties(
  limit = 8,
  options: RequestOptions = {},
): Promise<PropertySummary[]> {
  const data = await apiFetch<BackendListResponse<BackendPropertySummary>>(
    `${MLS}/properties/exclusive-properties/`,
    { revalidate: 600, ...options, params: { limit, ...options.params } },
  );
  return (data.results ?? []).map(mapPropertySummary);
}

export async function getOpenHouses(
  limit = 8,
  options: RequestOptions = {},
): Promise<PropertySummary[]> {
  const data = await apiFetch<
    BackendListResponse<BackendPropertySummary> | BackendPropertySummary[]
  >(`${MLS}/properties/open-houses/`, {
    revalidate: 300,
    ...options,
    params: { limit, ...options.params },
  });
  const rows = Array.isArray(data) ? data : (data.results ?? []);
  return rows.map(mapPropertySummary);
}

export async function getSimilarProperties(
  listingKey: string,
  options: RequestOptions = {},
): Promise<PropertySummary[]> {
  const data = await apiFetch<
    { results?: BackendPropertySummary[] } | BackendPropertySummary[]
  >(`${MLS}/properties/${encodeURIComponent(listingKey)}/recommendations/`, {
    revalidate: 600,
    ...options,
  });
  const rows = Array.isArray(data) ? data : (data.results ?? []);
  return rows.map(mapPropertySummary);
}

/** Listings flagged as community features (curated by the brokerage). */
export async function getCommunityProperties(
  limit = 8,
  options: RequestOptions = {},
): Promise<PropertySummary[]> {
  const data = await apiFetch<BackendListResponse<BackendPropertySummary>>(
    `${MLS}/properties/community-properties/`,
    { revalidate: 600, ...options, params: { limit, ...options.params } },
  );
  return (data.results ?? []).map(mapPropertySummary);
}

/**
 * Lease-only listings (lease_amount > 0). Backs the navbar's "Rent" entry point
 * more accurately than filtering resale rows by property type.
 */
export async function getLeaseProperties(
  limit = 12,
  options: RequestOptions = {},
): Promise<PropertySummary[]> {
  const data = await apiFetch<BackendListResponse<BackendPropertySummary>>(
    `${MLS}/properties/lease-properties/`,
    { revalidate: 600, ...options, params: { limit, ...options.params } },
  );
  return (data.results ?? []).map(mapPropertySummary);
}

/**
 * AI-written listing summary. The endpoint is generative, so treat a failure as
 * "no summary" rather than an error — the page always has public_remarks.
 */
export async function getListingSummary(
  listingKey: string,
  options: RequestOptions = {},
): Promise<string | null> {
  try {
    const data = await apiFetch<{ summary?: string; text?: string }>(
      `${MLS}/properties/ai-summary/`,
      { revalidate: 3600, ...options, params: { listing_key: listingKey } },
    );
    const summary = (data.summary ?? data.text ?? "").trim();
    return summary.length > 0 ? summary : null;
  } catch {
    return null;
  }
}
