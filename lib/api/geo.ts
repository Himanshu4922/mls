/**
 * Map support: place search and cluster aggregates.
 *
 *   locations/geocode/            → Nominatim-backed place lookup (CA/US)
 *   properties/map-aggregates/    → H3 cell counts for low/mid zoom levels
 *
 * The aggregates endpoint answers `mode: "listings"` once the zoom is high
 * enough that individual markers are appropriate — the caller then falls back
 * to the normal bbox listing search.
 */

import { apiFetch, type RequestOptions } from "@/lib/api/client";
import type { BackendMapAggregatesResponse } from "@/lib/types/backend";

const MLS = "/api/mls";

export interface GeocodeResult {
  label: string;
  latitude: number;
  longitude: number;
  /** OSM place class, e.g. "place", "boundary". */
  kind: string | null;
}

interface RawGeocode {
  display_name?: string;
  name?: string;
  lat?: string | number;
  lon?: string | number;
  latitude?: number;
  longitude?: number;
  class?: string;
  type?: string;
}

const num = (value: unknown): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

export async function geocodePlace(
  query: string,
  options: RequestOptions = {},
): Promise<GeocodeResult[]> {
  if (query.trim().length < 2) return [];

  const data = await apiFetch<{ results?: RawGeocode[] }>(
    `${MLS}/locations/geocode/`,
    { revalidate: 86_400, ...options, params: { q: query.trim() } },
  );

  return (data.results ?? [])
    .map((row) => {
      const latitude = num(row.lat) ?? num(row.latitude);
      const longitude = num(row.lon) ?? num(row.longitude);
      if (latitude === null || longitude === null) return null;
      return {
        label: (row.display_name ?? row.name ?? "").trim(),
        latitude,
        longitude,
        kind: row.class ?? row.type ?? null,
      };
    })
    .filter((row): row is GeocodeResult => row !== null && row.label.length > 0);
}

export interface MapCluster {
  latitude: number;
  longitude: number;
  count: number;
}

export interface MapAggregates {
  /** "listings" means: zoom in far enough, render individual markers instead. */
  mode: "aggregates" | "listings";
  clusters: MapCluster[];
}

export async function getMapAggregates(
  bounds: { latMin: number; latMax: number; lngMin: number; lngMax: number },
  zoom: number,
  options: RequestOptions = {},
): Promise<MapAggregates> {
  const data = await apiFetch<BackendMapAggregatesResponse>(
    `${MLS}/properties/map-aggregates/`,
    {
      ...options,
      params: {
        latitude_min: bounds.latMin,
        latitude_max: bounds.latMax,
        longitude_min: bounds.lngMin,
        longitude_max: bounds.lngMax,
        zoom,
      },
    },
  );

  return {
    mode: data.mode === "listings" ? "listings" : "aggregates",
    clusters: (data.results ?? [])
      .map((cell) => ({
        latitude: num(cell.latitude) ?? 0,
        longitude: num(cell.longitude) ?? 0,
        count: cell.count ?? 0,
      }))
      .filter((cell) => cell.count > 0 && cell.latitude !== 0),
  };
}
