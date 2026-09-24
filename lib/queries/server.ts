// Server-only: imports lib/auth/session (next/headers), which throws if pulled
// into a Client Component bundle. Never import this from a "use client" file.
import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";
import { getSubmission, type ListingSubmission } from "@/lib/api/listingSubmissions";
import { compareProperties } from "@/lib/api/properties";
import { getWatchedOverview, type WatchedOverview } from "@/lib/api/watched";
import { getCurrentUser, requireAccessToken } from "@/lib/auth/session";
import { qk } from "@/lib/queries/keys";
import type { AuthUser, PropertyDetail } from "@/lib/types/domain";

/**
 * Server half of the TanStack hand-off (docs/06 Phase 3).
 *
 * Server Components prefetch into a per-request QueryClient, then pass
 * `dehydrate(client)` to a <HydrationBoundary>. The keys come from the same
 * `qk` factory the client hooks use, and every queryFn below returns EXACTLY
 * what the matching `/api/*` route handler sends the browser — same lib/api
 * call, same input normalisation — so hydrated rows are indistinguishable
 * from a client fetch.
 *
 * Per-user data is only ever prefetched here from pages that read cookies
 * (and so render dynamically per request); never from a cached / ISR page.
 */

/**
 * One QueryClient per request. `cache()` is scoped to a single server render,
 * so nothing is shared between requests or users.
 *
 * staleTime mirrors QueryProvider's default (60s). A 0 staleTime would make
 * the client refetch everything it just received on hydration.
 */
export const getQueryClient = cache(
  (): QueryClient =>
    new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60_000,
          // A failed prefetch just leaves the key out of the dehydrated state
          // (only successful queries dehydrate) and the client fetches it
          // normally — retrying here would only delay the first byte.
          retry: false,
        },
      },
    }),
);

/** User + token from one resolution, memoised for this request. */
export const getServerSession = cache(
  async (): Promise<{ user: AuthUser; token: string } | null> => {
    const user = await getCurrentUser();
    if (!user) return null;
    const token = await requireAccessToken();
    return token ? { user, token } : null;
  },
);

/** Same cap `/api/properties/compare` applies before calling the backend. */
export const COMPARE_ID_LIMIT = 50;

/** Mirrors GET /api/watched. */
export async function prefetchWatchedOverview(
  client: QueryClient,
  session: { user: AuthUser; token: string },
): Promise<WatchedOverview | undefined> {
  const key = qk.me(session.user.id).overview;
  // The token only authenticates; the key must equal the client hook's
  // (user-scoped, token-free) key for hydration to match.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  await client.prefetchQuery({
    queryKey: key,
    queryFn: () => getWatchedOverview(session.token),
  });
  return client.getQueryData<WatchedOverview>(key);
}

/**
 * Mirrors `usePropertiesByIds(ids)`: the set entry under `qk.properties.byIds`
 * holds what GET /api/properties/compare returns for `ids` in the order given
 * (filtered, capped at 50), and each row is also seeded under
 * `qk.properties.byId(id)` exactly as the client queryFn does.
 */
export async function prefetchPropertiesByIds(
  client: QueryClient,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;
  await client.prefetchQuery({
    queryKey: qk.properties.byIds(ids),
    queryFn: async (): Promise<PropertyDetail[]> => {
      const requested = ids.filter(Boolean).slice(0, COMPARE_ID_LIMIT);
      const data = requested.length ? await compareProperties(requested) : [];
      for (const property of data) {
        client.setQueryData(qk.properties.byId(property.id), property);
      }
      return data;
    },
  });
}

/**
 * Mirrors GET /api/listing-submissions/<id>. A 403/404 (or any failure) makes
 * the prefetch fail, which keeps the key out of the dehydrated state; the
 * client then fetches and renders its own error state.
 */
export async function prefetchSubmission(
  client: QueryClient,
  session: { user: AuthUser; token: string },
  id: number,
): Promise<void> {
  // Token-free key, as above.
  // eslint-disable-next-line @tanstack/query/exhaustive-deps
  await client.prefetchQuery({
    queryKey: qk.me(session.user.id).submission(id),
    queryFn: (): Promise<ListingSubmission> => getSubmission(session.token, id),
  });
}
