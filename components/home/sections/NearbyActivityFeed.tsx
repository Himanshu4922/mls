"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/States";
import { useNearbyActivity } from "@/lib/queries/home";
import { daysSince, formatPrice } from "@/lib/utils/format";
import { NEIGHBOUR_RADIUS_KM, usePickedPlace } from "./NeighbourAlertForm";

function listedAgo(value: string | null): string {
  const days = daysSince(value);
  if (days === null) return "Recently listed";
  if (days <= 0) return "Listed today";
  if (days === 1) return "Listed yesterday";
  return `Listed ${days} days ago`;
}

/**
 * The panel beside the alert form. Before a place is picked it shows `sample`
 * (the reference's illustrative cards, labelled as an example); once picked,
 * live new listings within the alert radius from `nearby-activity/`.
 */
export function NearbyActivityFeed({ sample }: { sample: ReactNode }) {
  const { place } = usePickedPlace();
  const activity = useNearbyActivity(place ? { lat: place.lat, lng: place.lng } : null, {
    radiusKm: NEIGHBOUR_RADIUS_KM,
  });

  if (!place) return <>{sample}</>;

  const rows = activity.data?.results ?? [];
  return (
    <div aria-live="polite">
      {activity.isPending ? (
        <ul className="grid grid-cols-2 gap-4" aria-label="Loading nearby activity">
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index}>
              <Skeleton className="h-28 rounded-control" />
            </li>
          ))}
        </ul>
      ) : activity.isError ? (
        <p className="rounded-control border border-line p-5 text-small text-ink-muted">
          Nearby activity is unavailable right now. Your alert will still work.
        </p>
      ) : rows.length === 0 ? (
        <p className="rounded-control border border-line p-5 text-small text-ink-muted">
          No new listings within {NEIGHBOUR_RADIUS_KM} km in the last 30 days. Set an alert
          and we&apos;ll email you when one appears.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4" aria-label={`New listings near ${place.label}`}>
          {rows.map((row) => (
            <li key={row.listing_key}>
              <Link
                href={`/property/${encodeURIComponent(row.listing_key)}`}
                className="flex h-full flex-col rounded-control border border-line bg-surface p-3 transition-shadow hover:shadow-card-hover"
              >
                <Badge tone="navy" className="self-start px-2 py-0.5">
                  Just Listed
                </Badge>
                <p className="mt-2 text-small font-semibold text-ink">
                  {formatPrice(row.list_price)}
                </p>
                <p className="truncate text-caption text-ink-muted">
                  {row.address}
                  {row.city ? `, ${row.city}` : ""}
                </p>
                <p className="mt-0.5 text-caption text-ink-subtle">
                  {listedAgo(row.listed_at)} · {row.distance_km.toFixed(1)} km away
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-caption text-ink-subtle">
        Live MLS® activity within {NEIGHBOUR_RADIUS_KM} km of {place.label}.
      </p>
    </div>
  );
}
