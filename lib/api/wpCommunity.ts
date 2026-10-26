/**
 * Curated community profiles from the Estate4U WordPress site.
 *
 * The client pointed at `/wp-json/wp/v2/property`, but demographic / school /
 * lifestyle fields live on the sibling `/wp/v2/community` CPT (population,
 * average home price, school ratings, parks, transit, livability). Matched to
 * a listing by city name.
 */

const WP_SITE = (
  process.env.WP_SITE_URL ||
  process.env.NEXT_PUBLIC_WP_SITE_URL ||
  "https://whitesmoke-walrus-553332.hostingersite.com"
).replace(/\/$/, "");

export interface WpCommunitySchool {
  name: string;
  rating: string | null;
  type: string | null;
}

export interface WpCommunityTransit {
  name: string;
  subtext: string | null;
  time: string | null;
}

export interface WpCommunityProfile {
  name: string;
  subtext: string | null;
  population: string | null;
  averageHomePrice: string | null;
  yoyGrowth: string | null;
  livabilityScore: string | null;
  whyFamiliesLove: string | null;
  schools: WpCommunitySchool[];
  parks: string[];
  dining: string[];
  transit: WpCommunityTransit[];
}

type Acf = Record<string, unknown>;

function text(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function numbered(acf: Acf, prefix: string, count = 4): string[] {
  const items: string[] = [];
  for (let i = 1; i <= count; i++) {
    const value = text(acf[`${prefix}_${i}`] ?? acf[`${prefix}${i}`]);
    if (value) items.push(value);
  }
  return items;
}

function schoolsFrom(acf: Acf): WpCommunitySchool[] {
  const schools: WpCommunitySchool[] = [];
  for (let i = 1; i <= 3; i++) {
    const name = text(acf[`school_${i}`]);
    if (!name) continue;
    schools.push({
      name,
      rating: text(acf[`school_${i}_rating`]),
      type: text(acf[`school_${i}_type`]),
    });
  }
  return schools;
}

function transitFrom(acf: Acf): WpCommunityTransit[] {
  const rows: WpCommunityTransit[] = [];
  for (let i = 1; i <= 3; i++) {
    const name = text(acf[`transit_${i}`]);
    if (!name) continue;
    rows.push({
      name,
      subtext: text(acf[`transit_${i}_subtext`]),
      time: text(acf[`transit_${i}_time`]),
    });
  }
  return rows;
}

function normalizeCity(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mapProfile(acf: Acf, fallbackName: string): WpCommunityProfile | null {
  const name = text(acf.community_name) || fallbackName.trim() || null;
  if (!name) return null;
  return {
    name,
    subtext: text(acf.community_subtext),
    population: text(acf.population),
    averageHomePrice: text(acf.average_home_price),
    yoyGrowth: text(acf["y-o-y_growth"] ?? acf.yoy_growth),
    livabilityScore: text(acf.liability_score ?? acf.livability_score),
    whyFamiliesLove: text(acf.why_families_love),
    schools: schoolsFrom(acf),
    parks: numbered(acf, "parks"),
    dining: [
      ...numbered(acf, "dining_&_listing"),
      ...numbered(acf, "dining"),
    ].filter((value, index, all) => all.indexOf(value) === index),
    transit: transitFrom(acf),
  };
}

let cache: { at: number; byCity: Map<string, WpCommunityProfile> } | null = null;
const CACHE_MS = 60 * 60 * 1000;

/** Test helper — drop the in-memory catalogue between cases. */
export function resetWpCommunityCache() {
  cache = null;
}

async function loadProfiles(): Promise<Map<string, WpCommunityProfile>> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.byCity;

  const byCity = new Map<string, WpCommunityProfile>();
  try {
    const response = await fetch(`${WP_SITE}/wp-json/wp/v2/community?per_page=100`, {
      next: { revalidate: 3600 },
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return byCity;
    const rows = (await response.json()) as Array<{
      title?: { rendered?: string };
      acf?: Acf | null;
    }>;
    for (const row of rows) {
      const title =
        typeof row.title?.rendered === "string"
          ? row.title.rendered.replace(/<[^>]+>/g, "")
          : "";
      const profile = mapProfile(row.acf ?? {}, title);
      if (!profile) continue;
      byCity.set(normalizeCity(profile.name), profile);
    }
  } catch {
    return byCity;
  }

  cache = { at: now, byCity };
  return byCity;
}

/** Community profile for a listing city, or null when WP has no match. */
export async function getWpCommunityProfile(
  city: string | null | undefined,
): Promise<WpCommunityProfile | null> {
  if (!city?.trim()) return null;
  const byCity = await loadProfiles();
  const exact = byCity.get(normalizeCity(city));
  if (exact) return exact;

  // "Mississauga ON" / "City of Brampton" style labels.
  const needle = normalizeCity(city);
  for (const [key, profile] of byCity) {
    if (needle.includes(key) || key.includes(needle)) return profile;
  }
  return null;
}
