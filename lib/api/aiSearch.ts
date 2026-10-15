/**
 * AI search: a sentence → the same ListingQuery manual search builds.
 *
 * The backend (`POST /api/mls/ai-search/parse/`, Gemini behind it) returns
 * neutral filters; this module is the ONE translation between those and the
 * URL-backed ListingQuery, so AI results land on the ordinary /listings (or
 * /map-search) page with every AI decision shown as a removable filter pill.
 * The Gemini key lives only on the backend.
 */

import { apiFetch } from "@/lib/api/client";
import { SEARCH_PROPERTY_TYPES, type ListingQuery, type ListingSort } from "@/lib/types/domain";
import { backendStatusGroup, statusParamForGroup } from "@/lib/utils/status";

export const AI_QUERY_MAX_CHARS = 300;

/** Backend shape — every key is present, null when the sentence didn't say. */
export interface AiSearchFilters {
  transaction: "sale" | "rent" | null;
  listing_status: "active" | "sold" | null;
  property_type: string | null;
  city: string | null;
  postal_codes: string[];
  price_min: number | null;
  price_max: number | null;
  beds_min: number | null;
  baths_min: number | null;
  sqft_min: number | null;
  sqft_max: number | null;
  year_built_min: number | null;
  open_house: boolean | null;
  sort: Exclude<ListingSort, "relevance"> | null;
  keywords: string | null;
  semantic_text: string | null;
}

export interface AiSearchResult {
  filters: Partial<AiSearchFilters>;
  /** Requirements no filter could capture, e.g. "good schools". */
  unsupported: string[];
  /** True when the model was unavailable and the text became a keyword search. */
  fallback: boolean;
  cached: boolean;
}

const SORTS = new Set(["newest", "price-asc", "price-desc", "beds-desc", "sqft-desc"]);
const TYPES = new Set<string>(SEARCH_PROPERTY_TYPES);

function positive(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? Math.round(value) : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Backend filters → ListingQuery. Pure; exported for tests. */
export function aiFiltersToQuery(filters: Partial<AiSearchFilters>): ListingQuery {
  const postal = (filters.postal_codes ?? []).filter((code) => typeof code === "string" && code);
  const semantic = text(filters.semantic_text);
  return {
    transaction: filters.transaction === "rent" ? "rent" : "sale",
    status: filters.listing_status === "sold" ? statusParamForGroup("sold") : undefined,
    type: filters.property_type && TYPES.has(filters.property_type) ? filters.property_type : undefined,
    city: text(filters.city),
    postalCodes: postal.length ? postal : undefined,
    priceMin: positive(filters.price_min),
    priceMax: positive(filters.price_max),
    bedsMin: positive(filters.beds_min),
    bathsMin: positive(filters.baths_min),
    sqftMin: positive(filters.sqft_min),
    sqftMax: positive(filters.sqft_max),
    yearBuiltMin: positive(filters.year_built_min),
    openHouse: filters.open_house === true || undefined,
    search: text(filters.keywords),
    semantic,
    // No sort named: "Best match" when there are preferences to rank by.
    sort:
      filters.sort && SORTS.has(filters.sort)
        ? filters.sort
        : semantic
          ? "relevance"
          : "newest",
  };
}

/** ListingQuery → backend filters, sent as `current_filters` to refine a search. */
export function queryToAiFilters(query: ListingQuery): Partial<AiSearchFilters> {
  const out: Partial<AiSearchFilters> = {};
  if (query.transaction === "rent") out.transaction = "rent";
  if (backendStatusGroup(query.status) === "sold") out.listing_status = "sold";
  if (query.type) out.property_type = query.type;
  if (query.city) out.city = query.city;
  if (query.postalCodes?.length) out.postal_codes = query.postalCodes;
  if (query.priceMin) out.price_min = query.priceMin;
  if (query.priceMax) out.price_max = query.priceMax;
  if (query.bedsMin) out.beds_min = query.bedsMin;
  if (query.bathsMin) out.baths_min = query.bathsMin;
  if (query.sqftMin) out.sqft_min = query.sqftMin;
  if (query.sqftMax) out.sqft_max = query.sqftMax;
  if (query.yearBuiltMin) out.year_built_min = query.yearBuiltMin;
  if (query.openHouse) out.open_house = true;
  if (query.search) out.keywords = query.search;
  if (query.semantic) out.semantic_text = query.semantic;
  if (query.sort && query.sort !== "relevance" && query.sort !== "newest") out.sort = query.sort;
  return out;
}

const LOCAL_TYPES: Array<[string, string]> = [
  ["semi-detached", "Semi-Detached"],
  ["semi detached", "Semi-Detached"],
  ["townhouse", "Townhome"],
  ["townhome", "Townhome"],
  ["row house", "Townhome"],
  ["detached", "Detached"],
  ["condo", "Condo"],
  ["apartment", "Condo"],
  ["loft", "Condo"],
];
const LOCAL_CITIES = [
  "Richmond Hill",
  "Mississauga",
  "Newmarket",
  "Toronto",
  "Brampton",
  "Vaughan",
  "Markham",
  "Oakville",
  "Pickering",
  "Burlington",
  "Ajax",
  "Whitby",
  "Oshawa",
  "Milton",
  "Aurora",
];
const LOCAL_TRAITS: Array<[string, string]> = [
  ["backyard", "backyard"],
  ["subway", "near subway"],
  ["parking", "parking"],
  ["garage", "garage"],
  ["pool", "pool"],
  ["renovated", "renovated"],
  ["basement", "basement"],
  ["waterfront", "waterfront"],
  ["spacious", "large"],
  ["large", "large"],
  ["big", "large"],
];

function localMoney(chunk: string): number | null {
  const match = chunk.replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*(k|m|million)?/i);
  if (!match) return null;
  let amount = Number(match[1]);
  const unit = (match[2] || "").toLowerCase();
  if (unit === "k") amount *= 1000;
  else if (unit === "m" || unit === "million") amount *= 1_000_000;
  else if (amount < 10_000) return null;
  return Math.round(amount);
}

/** Reads beds, type, price and city when the model returned no filters. */
export function applyLocalSearch(query: string, result: AiSearchResult): AiSearchResult {
  if (!result.fallback) return result;
  const low = query.toLowerCase();
  const filters: Partial<AiSearchFilters> = { ...(result.filters ?? {}) };
  const property = LOCAL_TYPES.find(([needle]) => low.includes(needle));
  if (property) filters.property_type = property[1];
  const beds = low.match(/(\d+)\s*\+?\s*(?:bed(?:room)?s?|br)\b/);
  if (beds) filters.beds_min = Number(beds[1]);
  const baths = low.match(/(\d+)\s*\+?\s*(?:bath(?:room)?s?|ba)\b/);
  if (baths) filters.baths_min = Number(baths[1]);
  if (/\b(rent|lease|for rent)\b/.test(low)) filters.transaction = "rent";
  if (/\b(sold|recently sold)\b/.test(low)) filters.listing_status = "sold";
  const ceiling = low.match(/\b(?:under|below|less than|max(?:imum)?|up to)\s+\$?([0-9][0-9,.\s]*\s*(?:k|m|million)?)/);
  const floor = low.match(/\b(?:over|above|more than|at least|min(?:imum)?)\s+\$?([0-9][0-9,.\s]*\s*(?:k|m|million)?)/);
  if (ceiling) filters.price_max = localMoney(ceiling[1]);
  if (floor) filters.price_min = localMoney(floor[1]);
  const city = LOCAL_CITIES.find((name) => new RegExp(`\\b${name.toLowerCase()}\\b`).test(low));
  if (city) filters.city = city;
  const traits: string[] = [];
  for (const [needle, label] of LOCAL_TRAITS) {
    if (new RegExp(`\\b${needle}\\b`).test(low) && !traits.includes(label)) traits.push(label);
  }
  if (traits.length) filters.semantic_text = traits.join(", ");
  const useful = Object.entries(filters).some(([key, value]) => {
    if (key === "keywords" || key === "unsupported") return false;
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined && value !== "";
  });
  if (!useful) return result;
  return {
    ...result,
    fallback: false,
    filters: { ...filters, keywords: null },
  };
}

/** Server-side call behind app/api/ai-search. */
export function parseAiSearch(
  input: { query: string; currentFilters?: Partial<AiSearchFilters> | null },
  { token, clientIp }: { token: string | null; clientIp: string | null },
) {
  return apiFetch<AiSearchResult>("/api/mls/ai-search/parse/", {
    method: "POST",
    token,
    body: {
      query: input.query.slice(0, AI_QUERY_MAX_CHARS),
      current_filters: input.currentFilters ?? undefined,
    },
    // The backend rate-limits guests per client IP.
    headers: clientIp ? { "X-Forwarded-For": clientIp } : undefined,
    cache: "no-store",
    timeoutMs: 25_000,
  });
}
