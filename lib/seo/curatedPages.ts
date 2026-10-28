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
  /** Studio-only: false hides the search without deleting it. */
  enabled?: boolean;
}

/** Studio / SiteContent document for keyword searches. */
export interface CuratedDocument {
  pages: CuratedPage[];
}

export const CURATED_GROUPS: readonly CuratedGroup[] = [
  "Deals",
  "By price",
  "By type",
  "Rentals",
  "By city",
];

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

/** Code defaults edited in Studio; city pages stay generated below. */
export const DEFAULT_FIXED_PAGES: CuratedPage[] = [
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

export const CURATED_PAGES: readonly CuratedPage[] = [...DEFAULT_FIXED_PAGES, ...CITY_PAGES];

const BY_SLUG = new Map(CURATED_PAGES.map((page) => [page.slug, page]));

export function getCuratedPage(slug: string, pages: readonly CuratedPage[] = CURATED_PAGES): CuratedPage | null {
  if (pages === CURATED_PAGES) return BY_SLUG.get(slug) ?? null;
  return pages.find((page) => page.slug === slug) ?? null;
}

export function curatedPath(page: Pick<CuratedPage, "slug">): string {
  return `/homes/${page.slug}`;
}

/** Seed / reset the Studio draft from the shipped fixed searches. */
export function defaultCuratedDocument(): CuratedDocument {
  return {
    pages: DEFAULT_FIXED_PAGES.map((page) => ({
      slug: page.slug,
      label: page.label,
      h1: page.h1,
      description: page.description,
      group: page.group,
      query: {
        ...page.query,
        keywords: page.query.keywords ? [...page.query.keywords] : undefined,
      },
      enabled: true,
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isCuratedGroup(value: unknown): value is CuratedGroup {
  return typeof value === "string" && (CURATED_GROUPS as readonly string[]).includes(value);
}

/** Parse a Studio/API curated document into typed pages (skips invalid rows). */
export function parseCuratedDocument(raw: unknown): CuratedDocument {
  if (!isRecord(raw) || !Array.isArray(raw.pages)) return { pages: [] };
  const pages: CuratedPage[] = [];
  for (const item of raw.pages) {
    if (!isRecord(item)) continue;
    const slug = typeof item.slug === "string" ? item.slug.trim() : "";
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const h1 = typeof item.h1 === "string" ? item.h1.trim() : "";
    const description = typeof item.description === "string" ? item.description.trim() : "";
    if (!slug || !label || !h1 || !isCuratedGroup(item.group)) continue;
    const queryRaw = isRecord(item.query) ? item.query : {};
    const query: Partial<ListingQuery> = {};
    if (typeof queryRaw.status === "string" && queryRaw.status.trim()) query.status = queryRaw.status.trim();
    if (queryRaw.transaction === "sale" || queryRaw.transaction === "rent") query.transaction = queryRaw.transaction;
    if (typeof queryRaw.type === "string" && queryRaw.type.trim()) query.type = queryRaw.type.trim();
    if (typeof queryRaw.city === "string" && queryRaw.city.trim()) query.city = queryRaw.city.trim();
    const priceMin = Number(queryRaw.priceMin);
    const priceMax = Number(queryRaw.priceMax);
    const bedsMin = Number(queryRaw.bedsMin);
    if (Number.isFinite(priceMin) && priceMin > 0) query.priceMin = Math.round(priceMin);
    if (Number.isFinite(priceMax) && priceMax > 0) query.priceMax = Math.round(priceMax);
    if (Number.isFinite(bedsMin) && bedsMin > 0) query.bedsMin = Math.round(bedsMin);
    if (queryRaw.openHouse === true) query.openHouse = true;
    if (Array.isArray(queryRaw.keywords)) {
      const keywords = queryRaw.keywords
        .filter((word): word is string => typeof word === "string")
        .map((word) => word.trim())
        .filter(Boolean);
      if (keywords.length) query.keywords = keywords;
    }
    pages.push({
      slug,
      label,
      h1,
      description,
      group: item.group,
      query,
      enabled: item.enabled !== false,
    });
  }
  return { pages };
}

/**
 * Public list: Studio pages when published and non-empty, else code defaults.
 * City pages always append so community links stay available.
 */
export function mergeCuratedPages(document: unknown): CuratedPage[] {
  const parsed = parseCuratedDocument(document);
  const fixed =
    parsed.pages.length > 0
      ? parsed.pages.filter((page) => page.enabled !== false)
      : DEFAULT_FIXED_PAGES;
  // Studio may include By-city rows; drop auto city pages that collide on slug.
  const fixedSlugs = new Set(fixed.map((page) => page.slug));
  const cities = CITY_PAGES.filter((page) => !fixedSlugs.has(page.slug));
  return [...fixed, ...cities];
}

/** Pages grouped for the keyword block, in display order. */
export function curatedGroups(
  options: { includeCities?: boolean; pages?: readonly CuratedPage[] } = {},
): Array<{ group: CuratedGroup; pages: CuratedPage[] }> {
  const source = options.pages ?? CURATED_PAGES;
  const order: CuratedGroup[] = ["Deals", "By price", "By type", "Rentals", "By city"];
  return order
    .filter((group) => group !== "By city" || options.includeCities)
    .map((group) => ({ group, pages: source.filter((page) => page.group === group) }))
    .filter((entry) => entry.pages.length > 0);
}
