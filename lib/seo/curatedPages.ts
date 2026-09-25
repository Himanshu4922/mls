/**
 * Curated listing pages (scope #6: "Distress sale, POS Properties, Detached
 * Under 1M etc.") and the "Search by keywords" links that point at them
 * (scope #24, Zoocasa-style). One config drives the pages, the keyword block,
 * the HTML sitemap and the XML sitemap, so a link can never point at a page
 * that doesn't exist.
 *
 * Every page is a real, strict search: keyword pages match the listing
 * description (backend `keywords`), with fallback disabled so an empty result
 * reads as empty rather than as unrelated homes.
 */

import { COMMUNITY_CITIES } from "@/lib/constants/cities";
import type { ListingQuery } from "@/lib/types/domain";

export type CuratedGroup = "Deals" | "By price" | "By type" | "Rentals" | "By city";

export interface CuratedPage {
  slug: string;
  /** Short link text for the keyword block. */
  label: string;
  h1: string;
  /** Meta description and intro line. */
  description: string;
  group: CuratedGroup;
  query: Partial<ListingQuery>;
}

/*
 * Keyword lists are deliberately phrases. Single words over-match in free
 * text: "POS" is inside "possession", and "as is" inside "has island".
 */
const POWER_OF_SALE_KEYWORDS = ["power of sale", "power-of-sale", "mortgagee sale", "bank sale", "bank-owned"];
const DISTRESS_KEYWORDS = [
  "sold as is",
  "as-is",
  "estate sale",
  "handyman",
  "motivated seller",
  "fixer upper",
  "fixer-upper",
  "needs work",
  "tlc",
];

const FOR_SALE = { status: "Active" } as const;

const FIXED_PAGES: CuratedPage[] = [
  {
    slug: "power-of-sale",
    label: "Power of sale homes",
    h1: "Power of sale homes in the GTA",
    description: "Power of sale and bank-owned listings across the Greater Toronto Area, found in the listing description.",
    group: "Deals",
    query: { ...FOR_SALE, keywords: POWER_OF_SALE_KEYWORDS },
  },
  {
    slug: "distress-sale",
    label: "Distress sales",
    h1: "Distress sales and fixer-uppers",
    description: "Estate sales, as-is sales, handyman specials and motivated sellers across the GTA.",
    group: "Deals",
    query: { ...FOR_SALE, keywords: DISTRESS_KEYWORDS },
  },
  {
    slug: "open-houses",
    label: "Open houses",
    h1: "Upcoming open houses",
    description: "Homes for sale with an open house coming up across the GTA.",
    group: "Deals",
    query: { ...FOR_SALE, openHouse: true },
  },
  {
    slug: "detached-under-1m",
    label: "Detached under $1M",
    h1: "Detached homes under $1 million",
    description: "Detached houses for sale under $1,000,000 across the GTA.",
    group: "By price",
    query: { ...FOR_SALE, type: "Detached", priceMax: 1_000_000 },
  },
  {
    slug: "condos-under-500k",
    label: "Condos under $500K",
    h1: "Condos under $500,000",
    description: "Condo apartments for sale under $500,000 across the GTA.",
    group: "By price",
    query: { ...FOR_SALE, type: "Condo", priceMax: 500_000 },
  },
  {
    slug: "condos-under-700k",
    label: "Condos under $700K",
    h1: "Condos under $700,000",
    description: "Condo apartments for sale under $700,000 across the GTA.",
    group: "By price",
    query: { ...FOR_SALE, type: "Condo", priceMax: 700_000 },
  },
  {
    slug: "townhouses-under-900k",
    label: "Townhouses under $900K",
    h1: "Townhouses under $900,000",
    description: "Townhouses for sale under $900,000 across the GTA.",
    group: "By price",
    query: { ...FOR_SALE, type: "Townhome", priceMax: 900_000 },
  },
  {
    slug: "luxury-homes",
    label: "Luxury homes ($2M+)",
    h1: "Luxury homes over $2 million",
    description: "Homes for sale from $2,000,000 across the GTA.",
    group: "By price",
    query: { ...FOR_SALE, type: "Luxury" },
  },
  {
    slug: "3-bedroom-houses",
    label: "3-bed houses",
    h1: "3+ bedroom detached houses",
    description: "Detached houses with three or more bedrooms for sale across the GTA.",
    group: "By type",
    query: { ...FOR_SALE, type: "Detached", bedsMin: 3 },
  },
  {
    slug: "4-bedroom-houses",
    label: "4-bed houses",
    h1: "4+ bedroom detached houses",
    description: "Detached houses with four or more bedrooms for sale across the GTA.",
    group: "By type",
    query: { ...FOR_SALE, type: "Detached", bedsMin: 4 },
  },
  {
    slug: "semi-detached-homes",
    label: "Semi-detached homes",
    h1: "Semi-detached homes for sale",
    description: "Semi-detached houses for sale across the GTA.",
    group: "By type",
    query: { ...FOR_SALE, type: "Semi-Detached" },
  },
  {
    slug: "2-bedroom-condos",
    label: "2-bed condos",
    h1: "2+ bedroom condos",
    description: "Condo apartments with two or more bedrooms for sale across the GTA.",
    group: "By type",
    query: { ...FOR_SALE, type: "Condo", bedsMin: 2 },
  },
  {
    slug: "1-bedroom-condos",
    label: "1-bed condos",
    h1: "1+ bedroom condos",
    description: "Condo apartments with one or more bedrooms for sale across the GTA.",
    group: "By type",
    query: { ...FOR_SALE, type: "Condo", bedsMin: 1 },
  },
  {
    slug: "condos-for-rent",
    label: "Condos for rent",
    h1: "Condos for rent",
    description: "Condo apartments for rent across the GTA.",
    group: "Rentals",
    query: { transaction: "rent", type: "Condo" },
  },
  {
    slug: "houses-for-rent",
    label: "Houses for rent",
    h1: "Detached houses for rent",
    description: "Detached houses for rent across the GTA.",
    group: "Rentals",
    query: { transaction: "rent", type: "Detached" },
  },
  {
    slug: "rentals-under-2500",
    label: "Rentals under $2,500",
    h1: "Rentals under $2,500 a month",
    description: "Homes for rent under $2,500 per month across the GTA.",
    group: "Rentals",
    query: { transaction: "rent", priceMax: 2_500 },
  },
];

const CITY_TYPES = [
  { key: "condos", label: "Condos", type: "Condo" },
  { key: "detached-homes", label: "Detached homes", type: "Detached" },
  { key: "townhouses", label: "Townhouses", type: "Townhome" },
] as const;

const citySlug = (city: string) => city.toLowerCase().replace(/\s+/g, "-");

const CITY_PAGES: CuratedPage[] = COMMUNITY_CITIES.flatMap((city) =>
  CITY_TYPES.map(({ key, label, type }) => ({
    slug: `${key}-in-${citySlug(city)}`,
    label: `${label} in ${city}`,
    h1: `${label} for sale in ${city}`,
    description: `${label} for sale in ${city}, updated from the MLS® feed.`,
    group: "By city" as const,
    query: { ...FOR_SALE, city, type },
  })),
);

export const CURATED_PAGES: readonly CuratedPage[] = [...FIXED_PAGES, ...CITY_PAGES];

const BY_SLUG = new Map(CURATED_PAGES.map((page) => [page.slug, page]));

export function getCuratedPage(slug: string): CuratedPage | null {
  return BY_SLUG.get(slug) ?? null;
}

export function curatedPath(page: Pick<CuratedPage, "slug">): string {
  return `/homes/${page.slug}`;
}

/** Pages grouped for the keyword block, in display order. */
export function curatedGroups(options: { includeCities?: boolean } = {}): Array<{ group: CuratedGroup; pages: CuratedPage[] }> {
  const order: CuratedGroup[] = ["Deals", "By price", "By type", "Rentals", "By city"];
  return order
    .filter((group) => group !== "By city" || options.includeCities)
    .map((group) => ({ group, pages: CURATED_PAGES.filter((page) => page.group === group) }))
    .filter((entry) => entry.pages.length > 0);
}
