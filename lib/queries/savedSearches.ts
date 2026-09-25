"use client";

import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserKeys } from "@/components/providers/AuthProvider";
import type { AlertCadence, SavedFilters, SavedSearch } from "@/lib/api/savedSearches";
import { fetchJson } from "@/lib/queries/fetcher";
import { qk, type UserKeys } from "@/lib/queries/keys";

/**
 * Shared cache for the user's saved search. The toolbar button, the save modal
 * and the /watched panel all read this one key, so saving, renaming or
 * deleting in one place updates the others without a refetch dance.
 */

export function savedSearchesQuery(keys: UserKeys) {
  return queryOptions({
    queryKey: keys.savedSearches,
    queryFn: ({ signal }) =>
      fetchJson<SavedSearch[]>("/api/saved-searches", {
        signal,
        cache: "no-store",
        fallback: "Could not load your saved search.",
      }),
    staleTime: 30_000,
    gcTime: 10 * 60_000,
  });
}

/**
 * The user's saved search (one per user — see lib/api/savedSearches.ts).
 * `saved` is null when signed out or when none exists; `isPending` stays false
 * while signed out so callers never show a spinner to a guest.
 */
export function useSavedSearch() {
  const keys = useUserKeys();
  const query = useQuery({
    ...savedSearchesQuery(keys ?? qk.me(-1)),
    enabled: keys !== null,
  });
  const signedIn = keys !== null;
  return {
    saved: signedIn ? (query.data?.[0] ?? null) : null,
    isPending: signedIn && query.isPending,
    isError: signedIn && query.isError,
    refetch: query.refetch,
  };
}

/** Create, replace (PUT over the existing one), rename and delete. */
export function useSavedSearchActions() {
  const queryClient = useQueryClient();
  const keys = useUserKeys();

  // Every mutation returns the authoritative row; writing it straight into the
  // cache keeps the button, modal and panel in step instantly.
  const put = (row: SavedSearch | null) => {
    if (keys) queryClient.setQueryData<SavedSearch[]>(keys.savedSearches, row ? [row] : []);
  };

  const save = useMutation({
    mutationFn: (input: { name: string; filters: SavedFilters; alertCadence: AlertCadence; replaceId?: number }) =>
      fetchJson<SavedSearch>(
        input.replaceId ? `/api/saved-searches/${input.replaceId}` : "/api/saved-searches",
        {
          method: input.replaceId ? "PUT" : "POST",
          body: { name: input.name, filters: input.filters, alertCadence: input.alertCadence },
          fallback: "Could not save this search.",
        },
      ),
    onSuccess: put,
  });

  const rename = useMutation({
    mutationFn: (input: { id: number; name: string }) =>
      fetchJson<SavedSearch>(`/api/saved-searches/${input.id}`, {
        method: "PUT",
        body: { name: input.name },
        fallback: "Could not rename this search.",
      }),
    onSuccess: put,
  });

  const setAlerts = useMutation({
    mutationFn: (input: { id: number; alertCadence: AlertCadence }) =>
      fetchJson<SavedSearch>(`/api/saved-searches/${input.id}`, {
        method: "PUT",
        body: { alertCadence: input.alertCadence },
        fallback: "Could not update alerts for this search.",
      }),
    onSuccess: put,
  });

  const remove = useMutation({
    mutationFn: (id: number) =>
      fetchJson<unknown>(`/api/saved-searches/${id}`, {
        method: "DELETE",
        fallback: "Could not delete this search.",
      }),
    onSuccess: () => put(null),
  });

  return { save, rename, setAlerts, remove };
}
