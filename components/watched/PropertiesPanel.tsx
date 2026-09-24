"use client";

import { PropertyCard } from "@/components/property/PropertyCard";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, PropertyGridSkeleton } from "@/components/ui/States";
import { Tabs } from "@/components/ui/Tabs";
import { useWatched } from "@/components/providers/WatchedProvider";
import { ClearAllButton, PanelToolbar } from "@/components/watched/ClearAllButton";
import { STATUS_GROUPS, STATUS_TAB_ITEMS, propertyGroup } from "@/components/watched/model";
import type { WatchedPanelProps } from "@/components/watched/types";
import { usePropertiesByIds } from "@/lib/queries/properties";
import { pluralize } from "@/lib/utils/format";
import { STATUS_GROUP_LABELS, type StatusGroup } from "@/lib/utils/status";

/**
 * Saved homes, split For Sale / Sold / De-listed by LIVE status — the stored
 * snapshot predates any sale, so each home is hydrated through the compare
 * endpoint. Works signed out, from WatchedProvider's local favourites.
 */
export function PropertiesPanel({
  overview,
  signedIn,
  onSignIn,
  status,
  onStatusChange,
}: WatchedPanelProps) {
  const { favorites: providerFavorites, toggleFavorite, clearFavorites } = useWatched();
  /*
   * WatchedProvider sits above the page's HydrationBoundary, so on the first
   * (server) render it hasn't adopted the prefetched account list yet and
   * would paint "No saved homes yet". `overview` renders under the boundary
   * and already has it; use it until the provider catches up (it adopts the
   * same list in an effect, and every favourite write updates both).
   */
  const favorites =
    providerFavorites.length === 0 && overview && overview.favorites.length > 0
      ? overview.favorites.map((entry) => entry.propertyKey).filter(Boolean)
      : providerFavorites;
  const query = usePropertiesByIds(favorites);

  if (favorites.length === 0) {
    return (
      <EmptyState
        title="No saved homes yet"
        description="Tap the heart on any listing to save it here."
        action={{ label: "Browse listings", href: "/listings" }}
      />
    );
  }
  if (query.isError && !query.data) {
    return <ErrorState description="We couldn't load your saved homes." onRetry={() => query.refetch()} />;
  }
  if (!query.data) return <PropertyGridSkeleton count={3} />;

  const counts = Object.fromEntries(STATUS_GROUPS.map((group) => [group, 0])) as Record<StatusGroup, number>;
  for (const property of query.data) counts[propertyGroup(property)] += 1;
  const visible = query.data.filter((property) => propertyGroup(property) === status);

  return (
    <div className="space-y-6">
      {!signedIn && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-control border border-gold/30 bg-gold-soft px-4 py-3">
          <p className="text-small text-ink">
            These are saved on this device only. Sign in to sync them everywhere.
          </p>
          <Button variant="primary" size="sm" onClick={onSignIn}>
            Sign in
          </Button>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          variant="pill"
          size="sm"
          label="Listing status"
          items={STATUS_TAB_ITEMS.map((item) => ({ ...item, count: counts[item.id] }))}
          value={status}
          onChange={onStatusChange}
        />
        <ClearAllButton
          what="saved homes"
          onConfirm={async () => {
            // ClearAllButton shows a thrown message inside its confirm dialog.
            const error = await clearFavorites();
            if (error) throw new Error(error);
          }}
        />
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title={`No ${STATUS_GROUP_LABELS[status].toLowerCase()} homes saved`}
          description="Saved homes move between these tabs as their status changes."
        />
      ) : (
        <>
          <PanelToolbar summary={`${visible.length} ${pluralize(visible.length, "home")}`} />
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((property) => (
              <div key={property.id} className="flex flex-col gap-2">
                <PropertyCard property={property} />
                {/* Cards only show the heart on active listings, so off-market
                    saves need their own way out of the list. */}
                {property.status !== "active" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="self-start"
                    onClick={() => void toggleFavorite(property.id)}
                  >
                    Remove from saved
                  </Button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
