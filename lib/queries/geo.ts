"use client";

import { keepPreviousData, queryOptions, useQuery } from "@tanstack/react-query";
import type { GeocodeResult } from "@/lib/api/geo";
import { fetchJson } from "@/lib/queries/fetcher";
import { qk } from "@/lib/queries/keys";

/** Shortest place query worth sending to the geocoder. */
export const PLACE_SEARCH_MIN_CHARS = 2;

export function placeSearchQuery(q: string) {
  const term = q.trim();
  return queryOptions({
    queryKey: qk.geo.place(term),
    queryFn: ({ signal }) =>
      fetchJson<GeocodeResult[]>(`/api/geocode?q=${encodeURIComponent(term)}`, { signal }),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
  });
}

/**
 * Place suggestions for the map's location box. Pass an already-debounced
 * value; the previous suggestions stay visible while the next set loads.
 */
export function usePlaceSearch(q: string) {
  return useQuery({
    ...placeSearchQuery(q),
    enabled: q.trim().length >= PLACE_SEARCH_MIN_CHARS,
    placeholderData: keepPreviousData,
  });
}
