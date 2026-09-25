import type { ListingQuery, ListingSort, ListingTransaction } from "@/lib/types/domain";
import { parsePolygonParam, serializePolygonParam } from "@/lib/map/polygon";
import { parsePostalList } from "@/lib/utils/postal";

/**
 * URL search params are the single source of truth for listing filters, so any
 * filtered view is shareable and the back button restores it exactly.
 *
 * /listings and /map-search read the SAME params, so switching views carries
 * the search over instead of silently resetting it.
 */

export const PAGE_SIZE = 12;

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function int(value: string | string[] | undefined): number | undefined {
  const raw = first(value);
  if (!raw) return undefined;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

const SORTS: ListingSort[] = [
  "relevance",
  "newest",
  "price-asc",
  "price-desc",
  "beds-desc",
  "sqft-desc",
];

/**
 * `tx=rent` is Rent; anything else is Buy. `type=Rental` is the pre-`tx`
 * spelling (old links, bookmarks, saved searches) and still means Rent, so
 * it is lifted out of `type` rather than matched as a property type.
 */
function parseTransaction(params: RawParams): {
  transaction: ListingTransaction;
  type: string | undefined;
} {
  const type = first(params.type)?.trim() || undefined;
  const legacyRent = type?.toLowerCase() === "rental";
  const rent = first(params.tx)?.trim().toLowerCase() === "rent" || legacyRent;
  return { transaction: rent ? "rent" : "sale", type: legacyRent ? undefined : type };
}

/** Reads a listing query out of Next's resolved searchParams object. */
export function parseListingParams(params: RawParams): ListingQuery {
  const sortRaw = first(params.sort) as ListingSort | undefined;
  const { transaction, type } = parseTransaction(params);
  const page = int(params.page) ?? 1;
  // Invalid tokens in a hand-edited URL are dropped rather than failing the
  // page; the filter form is where a user gets told what was wrong.
  const postal = parsePostalList(first(params.postal) ?? "").codes;
  const polygon = parsePolygonParam(first(params.poly));
  const semantic = first(params.ai)?.trim().slice(0, 300) || undefined;
  // An AI search defaults to "Best match"; without its preferences there is
  // nothing to rank by, so "relevance" falls back to newest.
  const defaultSort: ListingSort = semantic ? "relevance" : "newest";
  const sort = sortRaw && SORTS.includes(sortRaw) ? sortRaw : defaultSort;

  return {
    search: first(params.q)?.trim() || undefined,
    city: first(params.city)?.trim() || undefined,
    status: first(params.status)?.trim() || undefined,
    transaction,
    type,
    priceMin: int(params.priceMin),
    priceMax: int(params.priceMax),
    bedsMin: int(params.beds),
    bathsMin: int(params.baths),
    sqftMin: int(params.sqftMin),
    sqftMax: int(params.sqftMax),
    yearBuiltMin: int(params.yearBuiltMin),
    postalCodes: postal.length > 0 ? postal : undefined,
    openHouse: first(params.openHouse) === "1" || undefined,
    polygon: polygon ?? undefined,
    semantic,
    view: first(params.view) === "list" ? "list" : undefined,
    sort: sort === "relevance" && !semantic ? "newest" : sort,
    limit: PAGE_SIZE,
    offset: (Math.max(1, page) - 1) * PAGE_SIZE,
  };
}

/** Same as `parseListingParams`, for a URLSearchParams (client components). */
export function parseListingSearch(search: URLSearchParams | string): ListingQuery {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return parseListingParams(Object.fromEntries(params.entries()));
}

/** Serializes a query into a bare querystring (no "?"), dropping defaults and blanks. */
export function buildListingQueryString(
  query: Partial<ListingQuery> & { page?: number },
): string {
  const params = new URLSearchParams();
  if (query.search) params.set("q", query.search);
  if (query.city) params.set("city", query.city);
  if (query.status) params.set("status", query.status);
  // Buy is the default, so only Rent is written.
  if (query.transaction === "rent") params.set("tx", "rent");
  if (query.type) params.set("type", query.type);
  if (query.priceMin) params.set("priceMin", String(query.priceMin));
  if (query.priceMax) params.set("priceMax", String(query.priceMax));
  if (query.bedsMin) params.set("beds", String(query.bedsMin));
  if (query.bathsMin) params.set("baths", String(query.bathsMin));
  if (query.sqftMin) params.set("sqftMin", String(query.sqftMin));
  if (query.sqftMax) params.set("sqftMax", String(query.sqftMax));
  if (query.yearBuiltMin) params.set("yearBuiltMin", String(query.yearBuiltMin));
  if (query.postalCodes?.length) params.set("postal", query.postalCodes.join(","));
  if (query.openHouse) params.set("openHouse", "1");
  const poly = serializePolygonParam(query.polygon);
  if (poly) params.set("poly", poly);
  if (query.semantic) params.set("ai", query.semantic);
  // Omit the default sort, which depends on whether `ai` is present.
  const defaultSort = query.semantic ? "relevance" : "newest";
  if (query.sort && query.sort !== defaultSort) params.set("sort", query.sort);
  if (query.view === "list") params.set("view", "list");
  if (query.page && query.page > 1) params.set("page", String(query.page));
  return params.toString();
}

/** Serializes a query back into a URL. Keeps `view` so pagination and tabs don't reset it. */
export function buildListingHref(
  query: Partial<ListingQuery> & { page?: number },
  base = "/listings",
): string {
  const qs = buildListingQueryString(query);
  return qs ? `${base}?${qs}` : base;
}

export function currentPage(query: ListingQuery): number {
  return Math.floor((query.offset ?? 0) / (query.limit ?? PAGE_SIZE)) + 1;
}

export function hasActiveFilters(query: ListingQuery): boolean {
  return Boolean(
    query.search ||
      query.city ||
      query.type ||
      query.priceMin ||
      query.priceMax ||
      query.bedsMin ||
      query.bathsMin ||
      query.sqftMin ||
      query.sqftMax ||
      query.yearBuiltMin ||
      query.postalCodes?.length ||
      query.openHouse ||
      query.semantic ||
      query.polygon?.length,
  );
}
