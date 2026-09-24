import { keepPreviousData, queryOptions, type Query } from "@tanstack/react-query";
import type { MapCluster } from "@/lib/api/geo";
import { fetchJson } from "@/lib/queries/fetcher";
import { mapViewKey, qk, type MapViewKey } from "@/lib/queries/keys";
import type { PropertySummary } from "@/lib/types/domain";

/**
 * Map search reads: listing rows for the viewport (or a drawn area) and H3
 * cluster counts for zoomed-out, unfiltered views.
 *
 * The component owns only "where the map is" (debounced); these options own
 * fetching, caching and cancellation. Panning back to a viewport seen in the
 * last minute is served from cache.
 */

/** Map listings are capped; the backend's page limit is 100. */
export const MAP_LIMIT = 100;

const MAP_STALE_TIME = 60_000;
const MAP_GC_TIME = 5 * 60_000;

export interface MapListings {
  items: PropertySummary[];
  total: number;
}

export interface MapAggregatesResponse {
  mode?: string;
  clusters?: MapCluster[];
}

export interface MapViewport {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
  zoom: number;
}

/**
 * The query view for the map, or null while there is nothing to ask for yet
 * (no viewport reported and no drawn area).
 *
 * A drawn area IS the query: its view carries no bounds, so panning around the
 * shape keeps the same key and never refetches — otherwise the results would
 * silently switch back to "whatever is in view".
 */
export function mapQueryView(input: {
  viewport: MapViewport | null;
  filters: string;
  poly: string;
}): MapViewKey | null {
  if (input.poly) {
    return mapViewKey({
      south: 0,
      west: 0,
      north: 0,
      east: 0,
      zoom: 0,
      filters: input.filters,
      poly: input.poly,
    });
  }
  if (!input.viewport) return null;
  const { latMin, latMax, lngMin, lngMax, zoom } = input.viewport;
  return mapViewKey({
    south: latMin,
    west: lngMin,
    north: latMax,
    east: lngMax,
    zoom,
    filters: input.filters,
  });
}

function boxParams(view: MapViewKey): Record<string, string> {
  const [south, west, north, east] = view.bounds;
  return {
    lat_min: String(south),
    lat_max: String(north),
    lng_min: String(west),
    lng_max: String(east),
  };
}

/** `/api/properties/map` URL: filters plus either the drawn area or the box. */
export function mapListingsUrl(view: MapViewKey): string {
  const qs = new URLSearchParams(view.filters);
  const area: Record<string, string> = view.poly ? { poly: view.poly } : boxParams(view);
  for (const [key, value] of Object.entries(area)) qs.set(key, value);
  qs.set("limit", String(MAP_LIMIT));
  return `/api/properties/map?${qs.toString()}`;
}

/** `/api/properties/aggregates` URL. H3 counts ignore listing filters. */
export function mapAggregatesUrl(view: MapViewKey): string {
  const qs = new URLSearchParams({ ...boxParams(view), zoom: String(view.zoom) });
  return `/api/properties/aggregates?${qs.toString()}`;
}

export function mapListingsQuery(view: MapViewKey) {
  return queryOptions({
    queryKey: qk.map.listings(view),
    queryFn: ({ signal }) =>
      fetchJson<MapListings>(mapListingsUrl(view), {
        signal,
        fallback: "Could not load listings for this area.",
      }),
    staleTime: MAP_STALE_TIME,
    gcTime: MAP_GC_TIME,
    // Pins stay on screen while the next viewport loads.
    placeholderData: keepIfNearby(view),
  });
}

export function mapAggregatesQuery(view: MapViewKey) {
  return queryOptions({
    queryKey: qk.map.aggregates(view),
    queryFn: ({ signal }) =>
      fetchJson<MapAggregatesResponse>(mapAggregatesUrl(view), { signal }),
    staleTime: MAP_STALE_TIME,
    gcTime: MAP_GC_TIME,
    placeholderData: keepPreviousData,
  });
}

/** True when an aggregates reply means "draw clusters, not pins". */
export function isClusterReply(reply: MapAggregatesResponse | undefined): boolean {
  return reply?.mode === "aggregates" && (reply.clusters?.length ?? 0) > 0;
}

/** [south, west, north, east] boxes share any area. */
export function boundsOverlap(
  a: MapViewKey["bounds"],
  b: MapViewKey["bounds"],
): boolean {
  return a[0] <= b[2] && b[0] <= a[2] && a[1] <= b[3] && b[1] <= a[3];
}

/**
 * keepPreviousData, but only when the previous result was for an overlapping
 * area under the same criteria. Plain keepPreviousData showed the pins of the
 * last marker-mode view — possibly a different part of the city — after
 * zooming in from clusters, until the new rows arrived.
 */
function keepIfNearby(view: MapViewKey) {
  return <T>(previous: T | undefined, previousQuery: Query<T, Error, T, readonly unknown[]> | undefined) => {
    const prior = previousQuery?.queryKey[2] as MapViewKey | undefined;
    if (!previous || !prior) return undefined;
    const sameCriteria = prior.filters === view.filters && prior.poly === view.poly;
    return sameCriteria && boundsOverlap(prior.bounds, view.bounds) ? previous : undefined;
  };
}
