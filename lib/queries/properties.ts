"use client";

import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PropertyDetail } from "@/lib/types/domain";
import { fetchJson } from "@/lib/queries/fetcher";
import { qk } from "@/lib/queries/keys";

/**
 * Client-side query hooks.
 *
 * These replace the hand-rolled useEffect + useState fetching that previously
 * lived in each component. That pattern caused two real bugs:
 *  - an empty-state flash, because the initial state had to guess between
 *    "empty" and "loading" before the effect had run
 *  - a Strict Mode double-mount race that discarded the first response
 *
 * `useQuery` has an explicit `isPending` from the very first render, and
 * dedupes/caches by key, so neither failure mode is expressible here.
 */

async function fetchProperties(
  ids: string[],
  signal?: AbortSignal,
): Promise<PropertyDetail[]> {
  const params = new URLSearchParams();
  ids.forEach((id) => params.append("ids", id));
  return fetchJson<PropertyDetail[]>(`/api/properties/compare?${params.toString()}`, {
    signal,
    fallback: "Could not load listings.",
  });
}

/** Cache key for one property, so a set query can seed and reuse single rows. */
const propertyKey = qk.properties.byId;

/**
 * Hydrates a set of listing keys into full records.
 *
 * Each result is ALSO written into a per-id cache entry, and the set query is
 * seeded back FROM those entries via `placeholderData`. Both halves matter:
 *
 * The key includes the ids, so adding or removing a home produces a key with
 * no cached data. Without the seed that put the whole set back into a pending
 * state, and callers that render a skeleton while `data` is undefined blanked
 * the entire page — a removal looked exactly like a full reload. When every
 * remaining id is already cached individually, the seed serves the new key
 * from memory and the removed column simply disappears.
 *
 * `placeholderData` (not `initialData`) is deliberate: placeholder data is not
 * written into the cache and does not count as fresh, so the set still
 * revalidates in the background and a genuinely new id is still fetched.
 */
export function usePropertiesByIds(ids: string[]) {
  const queryClient = useQueryClient();

  return useQuery<PropertyDetail[]>({
    queryKey: qk.properties.byIds(ids),
    enabled: ids.length > 0,
    queryFn: async ({ signal }): Promise<PropertyDetail[]> => {
      const data = await fetchProperties(ids, signal);
      for (const property of data) {
        queryClient.setQueryData(propertyKey(property.id), property);
      }
      return data;
    },
    /*
     * Rebuild the set from per-id entries when they are ALL present. A partial
     * set is not returned: rendering three of four homes as if complete would
     * make the fourth look removed rather than loading.
     */
    placeholderData: (): PropertyDetail[] | undefined => {
      if (ids.length === 0) return undefined;
      const cached = ids.map((id) =>
        queryClient.getQueryData<PropertyDetail>(propertyKey(id)),
      );
      return cached.every(Boolean) ? (cached as PropertyDetail[]) : undefined;
    },
  });
}

/**
 * Per-id lookup that reads whatever is already cached before fetching.
 *
 * Used by the compare strip: a home ticked on a listings page is usually
 * already in the cache, so its pill renders the address immediately rather
 * than waiting on a refetch of the whole set.
 */
export function usePropertyLookup(ids: string[]) {
  const results = useQueries({
    queries: ids.map((id) => ({
      queryKey: propertyKey(id),
      queryFn: async ({ signal }: { signal?: AbortSignal }) => {
        const [property] = await fetchProperties([id], signal);
        if (!property) throw new Error("Listing unavailable.");
        return property;
      },
    })),
  });

  const byId = new Map<string, PropertyDetail>();
  results.forEach((result, index) => {
    if (result.data) byId.set(ids[index], result.data);
  });
  return byId;
}
