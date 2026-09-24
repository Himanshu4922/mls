"use client";

import {
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useUserKeys } from "@/components/providers/AuthProvider";
import type {
  AlertPreferences,
  WatchedOverview,
  WatchedSnapshot,
} from "@/lib/api/watched";
import { fetchJson } from "@/lib/queries/fetcher";
import { qk, type UserKeys } from "@/lib/queries/keys";

/**
 * The signed-in user's saved surface (`/api/watched`): favourites, history,
 * toured, followed areas and alert preferences.
 *
 * Every hook here is keyed under `qk.me(userId)` and disabled while signed
 * out, so one account's rows can never render for another.
 */

/** User collections: fresh enough for 30s, kept 10m for back-navigation. */
const USER_STALE = 30_000;
const USER_GC = 10 * 60_000;

export function fetchWatchedOverview(signal?: AbortSignal): Promise<WatchedOverview> {
  return fetchJson<WatchedOverview>("/api/watched", {
    signal,
    fallback: "Could not load saved homes.",
  });
}

/** Shared definition for useQuery, fetchQuery / prefetchQuery and hydration. */
export function watchedOverviewQuery(keys: UserKeys) {
  return queryOptions({
    queryKey: keys.overview,
    queryFn: ({ signal }) => fetchWatchedOverview(signal),
    staleTime: USER_STALE,
    gcTime: USER_GC,
  });
}

/**
 * Shared by the watched page, the Watched menu, WatchedProvider's favourites
 * sync and the Toured / Watch buttons — one request for all of them.
 * `enabled` lets a caller defer further; signed-out always disables it.
 */
export function useWatchedOverview(enabled = true) {
  const keys = useUserKeys();
  return useQuery({
    // Signed out: a never-fetched placeholder key (user ids are positive, so
    // -1 can't collide) — `enabled: false` means it never runs.
    ...watchedOverviewQuery(keys ?? qk.me(-1)),
    enabled: enabled && keys !== null,
  });
}

/** The overview cache key for the current user, for direct cache writes. */
export function useOverviewKey() {
  return useUserKeys()?.overview ?? null;
}


/**
 * Shared optimistic plumbing for the overview-backed mutations: patch the
 * cache up front, restore it on failure, and revalidate either way so the
 * server's timestamps and snapshots replace the placeholder entry.
 */
function useOverviewMutation<V, R = unknown>({
  mutationFn,
  patch,
}: {
  mutationFn: (vars: V) => Promise<R>;
  patch: (prev: WatchedOverview, vars: V) => WatchedOverview;
}) {
  const queryClient = useQueryClient();
  const key = useOverviewKey();
  return useMutation({
    mutationFn,
    onMutate: async (vars: V) => {
      if (!key) return { previous: undefined };
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<WatchedOverview>(key);
      if (previous) queryClient.setQueryData(key, patch(previous, vars));
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (key && context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSettled: () => (key ? queryClient.invalidateQueries({ queryKey: key }) : undefined),
  });
}

const post = (url: string, body: unknown, fallback: string) =>
  fetchJson<unknown>(url, { method: "POST", body, fallback });

export interface TouredVars {
  propertyKey: string;
  snapshot?: WatchedSnapshot;
  /** The state the user asked for; the backend only offers a toggle. */
  toured: boolean;
}

export function useToggleToured() {
  return useOverviewMutation<TouredVars>({
    mutationFn: (vars) =>
      post(
        "/api/watched/toured",
        { property_key: vars.propertyKey, snapshot: vars.snapshot ?? {} },
        "Could not update toured homes.",
      ),
    patch: (prev, vars) => ({
      ...prev,
      toured: vars.toured
        ? [
            { propertyKey: vars.propertyKey, snapshot: vars.snapshot ?? {}, timestamp: new Date().toISOString() },
            ...prev.toured.filter((entry) => entry.propertyKey !== vars.propertyKey),
          ]
        : prev.toured.filter((entry) => entry.propertyKey !== vars.propertyKey),
    }),
  });
}

export interface FollowVars {
  areaKey: string;
  areaLabel?: string;
  areaKind?: string;
  follow: boolean;
}

export function useFollowArea() {
  return useOverviewMutation<FollowVars>({
    mutationFn: (vars) =>
      post(
        "/api/watched/areas",
        {
          area_key: vars.areaKey,
          area_label: vars.areaLabel,
          area_kind: vars.areaKind,
          action: vars.follow ? "follow" : "unfollow",
        },
        "Could not update followed areas.",
      ),
    patch: (prev, vars) => ({
      ...prev,
      followedAreas: vars.follow
        ? [
            {
              areaKey: vars.areaKey,
              areaLabel: vars.areaLabel ?? null,
              areaKind: vars.areaKind ?? "community",
              createdAt: new Date().toISOString(),
            },
            ...prev.followedAreas.filter((area) => area.areaKey !== vars.areaKey),
          ]
        : prev.followedAreas.filter((area) => area.areaKey !== vars.areaKey),
    }),
  });
}

/**
 * Alert preference toggles, optimistic: the switch flips immediately and
 * snaps back (with the caller showing the error) if the save fails.
 */
export function useUpdateAlertPrefs() {
  return useOverviewMutation<Partial<AlertPreferences>, AlertPreferences>({
    mutationFn: (prefs) =>
      fetchJson<AlertPreferences>("/api/watched/alerts", {
        method: "POST",
        body: prefs,
        fallback: "Could not save that preference.",
      }),
    patch: (prev, prefs) => ({
      ...prev,
      alertPreferences: { ...prev.alertPreferences, ...prefs },
    }),
  });
}

export type ClearableCollection = "history" | "toured" | "areas";

/**
 * Empties one account collection. Favourites are deliberately not accepted:
 * WatchedProvider holds its own favourites state — use its `clearFavorites`.
 */
export function useClearCollection() {
  const field = {
    history: "history",
    toured: "toured",
    areas: "followedAreas",
  } as const satisfies Record<ClearableCollection, keyof WatchedOverview>;
  return useOverviewMutation<ClearableCollection>({
    mutationFn: (collection) =>
      post("/api/watched/clear", { collection }, "Could not clear that list."),
    patch: (prev, collection) => ({ ...prev, [field[collection]]: [] }),
  });
}

/* ------------------------------------------------------------------------ */
/* Favourites. WatchedProvider owns the local list (it also works signed    */
/* out), so these hooks do the request and the overview cache write only;   */
/* the provider does its own optimistic flip and rollback.                  */
/* ------------------------------------------------------------------------ */

export interface ToggleFavoriteVars {
  listingKey: string;
  /** True when the home is being un-saved (the backend only offers a toggle). */
  removing: boolean;
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  const key = useOverviewKey();
  return useMutation({
    mutationFn: (vars: ToggleFavoriteVars) =>
      post(
        "/api/watched/favorites",
        { property_key: vars.listingKey },
        "Could not save that home. Please try again.",
      ),
    /*
     * Reconcile the shared overview cache in place rather than invalidating
     * it. Invalidating refetched /api/watched on every heart toggle, and the
     * watched page re-rendered off that response — so un-saving a home
     * flashed the whole grid as if the page had reloaded. The server response
     * carries no new information here: we already know exactly which key was
     * added or removed.
     */
    onSuccess: (_data, { listingKey, removing }) => {
      if (!key) return;
      queryClient.setQueryData<WatchedOverview>(key, (prev) => {
        if (!prev) return prev;
        if (removing) {
          return {
            ...prev,
            favorites: prev.favorites.filter((entry) => entry.propertyKey !== listingKey),
          };
        }
        if (prev.favorites.some((entry) => entry.propertyKey === listingKey)) return prev;
        return {
          ...prev,
          favorites: [...prev.favorites, { propertyKey: listingKey, snapshot: {}, timestamp: null }],
        };
      });
    },
  });
}

/** Empties the account's favourites; the cache is emptied in place on success. */
export function useClearFavorites() {
  const queryClient = useQueryClient();
  const key = useOverviewKey();
  return useMutation({
    mutationFn: () =>
      post("/api/watched/clear", { collection: "favorites" }, "Could not clear your saved homes."),
    onSuccess: () => {
      if (key) {
        queryClient.setQueryData<WatchedOverview>(key, (prev) =>
          prev ? { ...prev, favorites: [] } : prev,
        );
      }
    },
  });
}

/**
 * Uploads homes saved on this device before sign-in. Each key is posted on its
 * own; a failure leaves that key out of the result (the caller keeps it in
 * local storage for the next sign-in). Resolves to the keys that uploaded, and
 * invalidates the overview once since the account list changed.
 */
export function useMergeLocalFavorites() {
  const queryClient = useQueryClient();
  const key = useOverviewKey();
  return useMutation({
    mutationFn: async (listingKeys: string[]) => {
      const uploaded: string[] = [];
      for (const listingKey of listingKeys) {
        try {
          await post("/api/watched/favorites", { property_key: listingKey }, "merge failed");
          uploaded.push(listingKey);
        } catch {
          // Leave it in local storage; the next sign-in retries.
        }
      }
      return uploaded;
    },
    onSuccess: () => (key ? queryClient.invalidateQueries({ queryKey: key }) : undefined),
  });
}
