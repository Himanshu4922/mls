import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Suspense } from "react";
import { WatchedList } from "@/components/property/WatchedList";
import { PropertyGridSkeleton } from "@/components/ui/States";
import {
  getQueryClient,
  getServerSession,
  prefetchPropertiesByIds,
  prefetchWatchedOverview,
} from "@/lib/queries/server";

export const metadata: Metadata = {
  title: "Watched",
  description: "The homes, notes and areas you're watching, in one place.",
};

export default function WatchedPage() {
  return (
    <div className="container-page py-10">
      <h1 className="text-h1 text-ink">Watched</h1>
      <p className="mt-1 text-small text-ink-muted">
        Saved homes, notes, tours and the areas you follow.
      </p>
      <div className="mt-8">
        {/* WatchedList reads useSearchParams; without a boundary a prerendered
            page fails the build (Missing Suspense boundary with useSearchParams).
            The same boundary lets the heading stream while the prefetch runs. */}
        <Suspense fallback={<PropertyGridSkeleton count={3} />}>
          <HydratedWatchedList />
        </Suspense>
      </div>
    </div>
  );
}

/**
 * Prefetches the overview and the saved-homes grid so the first paint has
 * data instead of skeletons followed by two client round trips (docs/06
 * Phase 3). Per-user: this page reads cookies, so it renders per request and
 * is never statically cached. Signed out, nothing is prefetched.
 */
async function HydratedWatchedList() {
  const client = getQueryClient();
  const session = await getServerSession();
  if (session) {
    const overview = await prefetchWatchedOverview(client, session);
    // Same list, order and de-duplication WatchedProvider derives from the
    // overview, so the key matches the grid's usePropertiesByIds(favorites).
    const favorites = Array.from(
      new Set((overview?.favorites ?? []).map((entry) => entry.propertyKey).filter(Boolean)),
    );
    await prefetchPropertiesByIds(client, favorites);
  }

  return (
    <HydrationBoundary state={dehydrate(client)}>
      <WatchedList />
    </HydrationBoundary>
  );
}
