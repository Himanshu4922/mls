"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState, PropertyGridSkeleton } from "@/components/ui/States";
import { ClearAllButton, PanelToolbar } from "@/components/watched/ClearAllButton";
import {
  areaHref,
  snapshotAddress,
  snapshotCity,
  snapshotPrice,
  splitAreas,
} from "@/components/watched/model";
import type { WatchedPanelProps } from "@/components/watched/types";
import { useClearCollection, useFollowArea } from "@/lib/queries/watched";
import { EMPTY, formatDate, formatPrice, pluralize } from "@/lib/utils/format";
import type { FollowedArea, WatchedEntry } from "@/lib/api/watched";

/* -------------------------------------------------------------------------- */
/* Toured / Recently Viewed                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Rows render from the stored snapshot rather than re-fetching each listing —
 * the backend saves one alongside every entry precisely so these stay cheap.
 */
function EntriesPanel({
  entries,
  pending,
  kind,
}: {
  entries: WatchedEntry[];
  pending: boolean;
  kind: "toured" | "history";
}) {
  const clear = useClearCollection();
  if (pending) return <PropertyGridSkeleton count={1} />;

  if (entries.length === 0) {
    return (
      <EmptyState
        title={kind === "toured" ? "No toured homes yet" : "Nothing viewed yet"}
        description={
          kind === "toured"
            ? "Homes you mark as toured will appear here."
            : "Listings you open will appear here."
        }
        action={{ label: "Browse listings", href: "/listings" }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <PanelToolbar summary={`${entries.length} ${pluralize(entries.length, "home")}`}>
        <ClearAllButton
          what={kind === "toured" ? "toured homes" : "viewing history"}
          disabled={clear.isPending}
          onConfirm={() => clear.mutateAsync(kind).then(() => undefined)}
        />
      </PanelToolbar>
      <ul className="divide-y divide-line-soft rounded-surface border border-line bg-surface">
        {entries.map((entry) => {
          const price = snapshotPrice(entry);
          return (
            <li key={entry.propertyKey} className="flex items-baseline justify-between gap-4 px-5 py-4">
              <div className="min-w-0">
                <Link
                  href={`/property/${encodeURIComponent(entry.propertyKey)}`}
                  className="block truncate text-small font-medium text-ink hover:text-gold"
                >
                  {snapshotAddress(entry)}
                </Link>
                <p className="text-caption text-ink-muted">
                  {snapshotCity(entry) ?? EMPTY}
                  {entry.timestamp && ` · ${formatDate(entry.timestamp)}`}
                </p>
              </div>
              <span className="shrink-0 text-small font-medium text-ink">
                {price === null ? EMPTY : formatPrice(price)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function TouredPanel({ overview, overviewPending }: WatchedPanelProps) {
  return <EntriesPanel entries={overview?.toured ?? []} pending={overviewPending} kind="toured" />;
}

export function HistoryPanel({ overview, overviewPending }: WatchedPanelProps) {
  return <EntriesPanel entries={overview?.history ?? []} pending={overviewPending} kind="history" />;
}

/* -------------------------------------------------------------------------- */
/* Areas / Communities                                                         */
/* -------------------------------------------------------------------------- */

function FollowedAreasPanel({
  overview,
  pending,
  group,
}: {
  overview: WatchedPanelProps["overview"];
  pending: boolean;
  group: "areas" | "communities";
}) {
  const follow = useFollowArea();
  const clear = useClearCollection();
  const [error, setError] = useState<string | null>(null);

  if (pending) return <PropertyGridSkeleton count={1} />;

  const split = splitAreas(overview?.followedAreas ?? []);
  const areas = split[group];
  const other = split[group === "areas" ? "communities" : "areas"];
  const noun = group === "areas" ? "area" : "community";

  if (areas.length === 0) {
    return (
      <EmptyState
        title={group === "areas" ? "No areas followed" : "No communities followed"}
        description="Watch a community to get alerts when new homes are listed there."
        action={{ label: "Explore communities", href: "/communities" }}
      />
    );
  }

  function unfollow(area: FollowedArea) {
    setError(null);
    follow.mutate(
      { areaKey: area.areaKey, follow: false },
      { onError: (err) => setError(err.message) },
    );
  }

  /*
   * areas/clear/ wipes BOTH tabs (they are one table upstream), so it is only
   * used when the other tab is already empty; otherwise unfollow one by one.
   */
  async function clearGroup() {
    if (other.length === 0) {
      await clear.mutateAsync("areas");
      return;
    }
    await Promise.all(
      areas.map((area) => follow.mutateAsync({ areaKey: area.areaKey, follow: false })),
    );
  }

  return (
    <div className="space-y-4">
      <PanelToolbar summary={`${areas.length} ${pluralize(areas.length, noun, group)}`}>
        <ClearAllButton
          what={group === "areas" ? "followed areas" : "followed communities"}
          disabled={clear.isPending}
          onConfirm={clearGroup}
        />
      </PanelToolbar>
      {error && (
        <p role="alert" className="text-caption text-negative">
          {error}
        </p>
      )}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {areas.map((area) => (
          <li
            key={area.areaKey}
            className="flex items-center justify-between gap-3 rounded-surface border border-line bg-surface px-4 py-3"
          >
            <div className="min-w-0">
              <Link
                href={areaHref(area)}
                className="block truncate text-small font-medium text-ink hover:text-gold"
              >
                {area.areaLabel ?? area.areaKey}
              </Link>
              <p className="text-caption text-ink-muted">
                {area.createdAt ? `Since ${formatDate(area.createdAt)}` : area.areaKind}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => unfollow(area)}
              aria-label={`Unfollow ${area.areaLabel ?? area.areaKey}`}
            >
              Unfollow
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AreasPanel({ overview, overviewPending }: WatchedPanelProps) {
  return <FollowedAreasPanel overview={overview} pending={overviewPending} group="areas" />;
}

export function CommunitiesPanel({ overview, overviewPending }: WatchedPanelProps) {
  return <FollowedAreasPanel overview={overview} pending={overviewPending} group="communities" />;
}
