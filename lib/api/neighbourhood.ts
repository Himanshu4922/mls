/**
 * Neighbourhood context for the property detail page.
 *
 * Backed by mls-v2's OpenStreetMap-derived endpoints:
 *   nearest-school/   → Overpass schools within a radius (cached server-side)
 *   nearby-amenities/ → groceries / cafes / parks / transit, grouped
 *   census/fsa/<fsa>/ → StatCan census profile for the forward sortation area
 *
 * These power the reference's "Catchment Schools" and "Neighbourhood Insights"
 * sections. Note the school records carry NO rating — the reference showed
 * "8.6 / 10" scores that OSM does not provide (see API_GAPS G13).
 */

import { apiFetch, type RequestOptions } from "@/lib/api/client";

const MLS = "/api/mls";

export interface NearbySchool {
  name: string;
  operator: string | null;
  /** OSM `amenity` tag: "school", "college", "university". */
  kind: string | null;
  address: string | null;
  distanceKm: number | null;
  website: string | null;
}

interface RawSchool {
  name?: string;
  operator?: string | null;
  amenity?: string | null;
  address?: string | null;
  distance_km?: number | null;
  distance_meters?: number | null;
  website?: string | null;
}

export async function getNearbySchools(
  lat: number,
  lon: number,
  options: RequestOptions & { radius?: number } = {},
): Promise<NearbySchool[]> {
  const { radius = 3000, ...rest } = options;
  const data = await apiFetch<{ nearest_schools?: RawSchool[] }>(
    `${MLS}/nearest-school/`,
    { revalidate: 86_400, ...rest, params: { lat, lon, radius } },
  );

  return (data.nearest_schools ?? [])
    .map((school) => ({
      name: school.name?.trim() || "Unnamed school",
      operator: school.operator?.trim() || null,
      kind: school.amenity?.trim() || null,
      address: school.address?.trim() || null,
      distanceKm:
        typeof school.distance_km === "number"
          ? school.distance_km
          : typeof school.distance_meters === "number"
            ? school.distance_meters / 1000
            : null,
      website: school.website?.trim() || null,
    }))
    .filter((school) => school.name !== "Unnamed school" || school.address);
}

export type AmenityCategory = "groceries" | "cafes" | "parks" | "transit";

export interface Amenity {
  name: string;
  address: string | null;
}

export type AmenitiesByCategory = Record<AmenityCategory, Amenity[]>;

export const AMENITY_LABELS: Record<AmenityCategory, string> = {
  groceries: "Groceries",
  cafes: "Cafés & restaurants",
  parks: "Parks & recreation",
  transit: "Transit",
};

export async function getNearbyAmenities(
  lat: number,
  lon: number,
  options: RequestOptions & { radius?: number } = {},
): Promise<AmenitiesByCategory> {
  const { radius = 1500, ...rest } = options;
  const data = await apiFetch<{
    categories?: Partial<Record<AmenityCategory, Array<{ name?: string; address?: string }>>>;
  }>(`${MLS}/nearby-amenities/`, {
    revalidate: 86_400,
    ...rest,
    params: { lat, lon, radius },
  });

  const empty: AmenitiesByCategory = {
    groceries: [],
    cafes: [],
    parks: [],
    transit: [],
  };

  for (const key of Object.keys(empty) as AmenityCategory[]) {
    empty[key] = (data.categories?.[key] ?? [])
      .map((item) => ({
        name: item.name?.trim() || "",
        address: item.address?.trim() || null,
      }))
      .filter((item) => item.name.length > 0 && item.name !== "Unnamed")
      .slice(0, 6);
  }

  return empty;
}

/** Price/status history for a listing, from PropertySnapshot rows. */
export interface PriceSnapshot {
  listPrice: number | null;
  status: string | null;
  recordedAt: string | null;
}

export async function getPropertySnapshots(
  listingKey: string,
  options: RequestOptions = {},
): Promise<PriceSnapshot[]> {
  const data = await apiFetch<{
    snapshots?: Array<{
      list_price?: number | null;
      standard_status?: string | null;
      source_modification_timestamp?: string | null;
      created_at?: string | null;
    }>;
  }>(`${MLS}/properties/${encodeURIComponent(listingKey)}/snapshots/`, {
    revalidate: 600,
    ...options,
  });

  return (data.snapshots ?? [])
    .map((row) => ({
      listPrice: typeof row.list_price === "number" ? row.list_price : null,
      status: row.standard_status ?? null,
      recordedAt: row.source_modification_timestamp ?? row.created_at ?? null,
    }))
    .filter((row) => row.recordedAt !== null)
    .sort((a, b) => (a.recordedAt! < b.recordedAt! ? -1 : 1));
}

/** Census profile for a forward sortation area (first 3 chars of a postal code). */
export async function getCensusProfile(
  fsa: string,
  options: RequestOptions = {},
): Promise<Record<string, unknown> | null> {
  const code = fsa.replace(/\s/g, "").slice(0, 3).toUpperCase();
  if (code.length !== 3) return null;
  try {
    return await apiFetch<Record<string, unknown>>(
      `${MLS}/census/fsa/${encodeURIComponent(code)}/`,
      { revalidate: 86_400, ...options },
    );
  } catch {
    // Census coverage is partial; absence is normal, not an error.
    return null;
  }
}
