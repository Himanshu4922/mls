/**
 * Hero filter dropdown options — editable in Studio with strict value rules so
 * a bad edit never produces a broken /listings URL.
 */

import { SEARCH_PROPERTY_TYPES } from "@/lib/types/domain";

export type HeroOption = { value: string; label: string };
export type HeroPopularSearch = { label: string; query: string };

export const HERO_INTENT_VALUES = ["buy", "rent", "sold"] as const;
export type HeroIntentValue = (typeof HERO_INTENT_VALUES)[number];

const PROPERTY_TYPE_SET = new Set<string>(SEARCH_PROPERTY_TYPES);

/** Allowed query keys for popular-search chips (matches parseListingParams). */
export const HERO_POPULAR_PARAM_KEYS = new Set([
  "type",
  "city",
  "priceMin",
  "priceMax",
  "beds",
  "baths",
  "tx",
  "status",
  "q",
  "postal",
]);

/** Empty (Any), `min-max`, or open-ended `min-`. */
const PRICE_VALUE = /^$|^\d+-\d*$/;

export function isHeroPriceValue(value: string): boolean {
  return PRICE_VALUE.test(value.trim());
}

export function isHeroPropertyTypeValue(value: string): boolean {
  return value === "" || PROPERTY_TYPE_SET.has(value);
}

export function isHeroCountValue(value: string): boolean {
  if (value === "") return true;
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 20;
}

export function isHeroIntentValue(value: string): value is HeroIntentValue {
  return (HERO_INTENT_VALUES as readonly string[]).includes(value);
}

/** Reject unknown params so a typo can't invent broken filters. */
export function validateHeroPopularQuery(query: string): string | null {
  const trimmed = query.trim().replace(/^\?/, "");
  if (!trimmed) return "Add at least one filter, e.g. type=Condo&priceMax=800000.";
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(trimmed);
  } catch {
    return "Use key=value pairs separated by &.";
  }
  const keys = [...params.keys()];
  if (keys.length === 0) return "Add at least one filter, e.g. city=Toronto.";
  for (const key of keys) {
    if (!HERO_POPULAR_PARAM_KEYS.has(key)) {
      return `Unknown filter “${key}”. Use: ${[...HERO_POPULAR_PARAM_KEYS].join(", ")}.`;
    }
    if (!params.get(key)?.trim()) return `Give “${key}” a value.`;
  }
  const type = params.get("type");
  if (type && !PROPERTY_TYPE_SET.has(type)) {
    return `Property type must be one of: ${SEARCH_PROPERTY_TYPES.join(", ")}.`;
  }
  const tx = params.get("tx");
  if (tx && tx !== "sale" && tx !== "rent") return "tx must be sale or rent.";
  return null;
}

export function normalizeHeroPopularQuery(query: string): string {
  return query.trim().replace(/^\?/, "");
}

function asOption(row: unknown): HeroOption | null {
  if (!row || typeof row !== "object") return null;
  const record = row as Record<string, unknown>;
  const value = typeof record.value === "string" ? record.value : null;
  const label = typeof record.label === "string" ? record.label.trim() : "";
  if (value === null || !label) return null;
  return { value, label };
}

export function readHeroOptions(
  content: Record<string, unknown> | undefined,
  key: string,
  fallback: HeroOption[],
  isValid: (value: string) => boolean,
): HeroOption[] {
  const raw = content?.[key];
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const options = raw.map(asOption).filter((row): row is HeroOption => !!row && isValid(row.value));
  return options.length ? options : fallback;
}

export function readHeroPopularSearches(
  content: Record<string, unknown> | undefined,
  fallback: HeroPopularSearch[],
): HeroPopularSearch[] {
  const raw = content?.popularSearches;
  if (!Array.isArray(raw) || raw.length === 0) return fallback;
  const rows: HeroPopularSearch[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const record = item as Record<string, unknown>;
    const label = typeof record.label === "string" ? record.label.trim() : "";
    const query = typeof record.query === "string" ? normalizeHeroPopularQuery(record.query) : "";
    if (!label || !query || validateHeroPopularQuery(query)) continue;
    rows.push({ label, query });
  }
  return rows.length ? rows : fallback;
}
