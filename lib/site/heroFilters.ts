/**
 * Hero filter dropdown options — editable in Studio with strict value rules so
 * a bad edit never produces a broken /listings URL.
 */

import { SEARCH_PROPERTY_TYPES } from "@/lib/types/domain";

export type HeroOption = { value: string; label: string };

export const HERO_INTENT_VALUES = ["buy", "rent", "sold"] as const;
export type HeroIntentValue = (typeof HERO_INTENT_VALUES)[number];

const PROPERTY_TYPE_SET = new Set<string>(SEARCH_PROPERTY_TYPES);

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
