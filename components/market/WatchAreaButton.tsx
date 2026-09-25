"use client";

import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { useFollowArea, useWatchedOverview } from "@/lib/queries/watched";

/**
 * "Watch" on Market Trends (scope #9, HouseSigma's watch box): follows the
 * city or community shown, so it appears under Watched > Areas and feeds the
 * daily email's "communities I watch" section. Signed out, it opens sign-up.
 */
export function WatchAreaButton({ label }: { label: string }) {
  const { user, openAuth } = useAuth();
  const overview = useWatchedOverview(Boolean(user));
  const follow = useFollowArea();
  // Same key shape AlertsCta uses, so both buttons agree on "watching".
  const areaKey = label.toLowerCase();
  const watching = Boolean(overview.data?.followedAreas.some((area) => area.areaKey === areaKey));

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-surface border border-line bg-surface-alt px-4 py-3">
      <p className="min-w-0 flex-1 text-small text-ink-soft">
        {watching ? `You're watching ${label}.` : `Watch ${label} to get new listings and price changes by email.`}
      </p>
      <Button
        variant={watching ? "secondary" : "primary"}
        size="sm"
        loading={follow.isPending}
        onClick={() => {
          if (!user) {
            openAuth("signup");
            return;
          }
          // "community" always: the backend upserts on area_key, and mixed
          // kinds made an area flip between Watched tabs (see AlertsCta).
          follow.mutate({ areaKey, areaLabel: label, areaKind: "community", follow: !watching });
        }}
      >
        {watching ? "Watching" : "Watch"}
      </Button>
      {follow.error && (
        <p role="alert" className="w-full text-caption text-negative">
          {follow.error.message}
        </p>
      )}
    </div>
  );
}
