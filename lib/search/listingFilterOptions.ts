/**
 * Shared option lists for the public listings filter sheet and the Studio
 * keyword → search-definition editor. Keep these in sync so admins can
 * configure every criterion buyers can search with.
 */

import type { ListingQuery } from "@/lib/types/domain";

export const BED_OPTIONS = [1, 2, 3, 4, 5] as const;
export const BATH_OPTIONS = [1, 2, 3, 4] as const;
export const GARAGE_OPTIONS = [1, 2, 3] as const;
export const FLOOR_OPTIONS = [1, 2, 3] as const;
export const KITCHEN_OPTIONS = [1, 2, 3] as const;
export const DOM_OPTIONS = [7, 14, 30, 60, 90] as const;
export const YEAR_BUILT_MIN_OPTIONS = [2020, 2010, 2000, 1990, 1980] as const;

/** Exact feed values; each was checked to return listings. */
export const BUILDING_OPTIONS = [
  "House",
  "Row / Townhouse",
  "Apartment",
  "Duplex",
  "Mobile Home",
] as const;

export const OWNERSHIP_OPTIONS = ["Freehold", "Condo/Strata", "Leasehold"] as const;

export const BASEMENT_OPTIONS: ReadonlyArray<{
  value: "" | NonNullable<ListingQuery["basement"]>;
  label: string;
}> = [
  { value: "", label: "Any" },
  { value: "yes", label: "Yes" },
  { value: "finished", label: "Finished" },
  { value: "unfinished", label: "Unfinished" },
  { value: "apartment", label: "Apartment / walk-out" },
];

export const BASEMENT_VALUES = new Set(
  BASEMENT_OPTIONS.map((option) => option.value).filter(Boolean),
);
