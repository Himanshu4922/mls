"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { UnavailableNote } from "@/components/ui/States";
import {
  AMENITY_LABELS,
  type AmenitiesByCategory,
  type AmenityCategory,
  type NearbySchool,
} from "@/lib/api/neighbourhood";
import { EMPTY } from "@/lib/utils/format";

/**
 * Nearby schools for the property Schools tab.
 *
 * Names and distances come from OpenStreetMap. The /10 figure is a proximity
 * score (closer scores higher), shown in the reference card layout. It is not
 * an EQAO or school-board ranking — the feed has none.
 */
export function SchoolsSection({
  schools,
  city,
}: {
  schools: NearbySchool[];
  city?: string | null;
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? schools : schools.slice(0, 5);
  const homesHref = city ? `/listings?city=${encodeURIComponent(city)}` : "/listings";

  if (schools.length === 0) {
    return (
      <section>
        <h2 className="text-[20px] font-semibold text-ink">Catchment Schools</h2>
        <UnavailableNote className="mt-3">
          No school data is available for this location.
        </UnavailableNote>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-2 text-[20px] font-semibold text-ink">Catchment Schools</h2>
      <p className="mb-5 text-[13px] text-ink-muted">
        Within 15 km. The score is how close the school is — confirm the catchment with the school board.
      </p>
      <ul className="space-y-4">
        {visible.map((school, index) => {
          const meta = [school.operator, school.kind ? titleize(school.kind) : null]
            .filter(Boolean)
            .join(" · ");
          const rating = proximityScore(school.distanceKm);
          const stars = Math.round(rating / 2);
          return (
            <li key={`${school.name}-${index}`} className="rounded-xl border border-line p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-surface-alt text-2xl">
                    <span aria-hidden="true">🏫</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-ink">{school.name}</p>
                    <p className="mt-0.5 text-[12px] text-ink-muted">{meta || school.address || "School"}</p>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="mb-1 flex items-center justify-end gap-1">
                    <span className="text-[20px] font-bold text-ink">{rating.toFixed(1)}</span>
                    <span className="text-[12px] text-ink-muted">/10</span>
                  </div>
                  <div className="flex justify-end gap-0.5" aria-label={`${rating.toFixed(1)} out of 10`}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star} className={star <= stars ? "text-yellow-400" : "text-line"}>
                        ★
                      </span>
                    ))}
                  </div>
                  <p className="mt-0.5 text-[12px] text-ink-muted">
                    {school.distanceKm === null ? EMPTY : `${school.distanceKm.toFixed(1)} km`}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-4">
                <div className="h-2 flex-1 rounded-full bg-surface-alt">
                  <div className="h-2 rounded-full bg-navy" style={{ width: `${rating * 10}%` }} />
                </div>
                <Link
                  href={homesHref}
                  className="whitespace-nowrap text-[12px] font-medium text-navy hover:underline"
                >
                  View homes in zone →
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
      {schools.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="mt-4 w-full rounded-xl border border-line py-3 text-[14px] font-medium text-ink hover:border-navy"
        >
          {expanded ? "Show fewer schools" : "Show More Schools"}
        </button>
      )}
    </section>
  );
}

/** Groceries, cafés, parks and transit for the Community tab. */
export function AmenitiesSection({ amenities }: { amenities: AmenitiesByCategory }) {
  const groups = (Object.keys(AMENITY_LABELS) as AmenityCategory[]).filter(
    (key) => amenities[key].length > 0,
  );

  if (groups.length === 0) {
    return (
      <section>
        <h2 className="text-[18px] font-semibold text-ink">What&rsquo;s nearby</h2>
        <UnavailableNote className="mt-3">
          No nearby places are available for this location.
        </UnavailableNote>
      </section>
    );
  }

  return (
    <section>
      <h2 className="text-h2 text-ink">What&rsquo;s nearby</h2>
      <p className="mt-1 text-caption text-ink-muted">Within 1.5 km, from OpenStreetMap.</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {groups.map((key) => (
          <div key={key} className="rounded-surface border border-line p-4 sm:p-5">
            <h3 className="flex items-center gap-2 text-small font-semibold text-ink">
              {AMENITY_LABELS[key]}
              <Badge tone="neutral">{amenities[key].length}</Badge>
            </h3>
            <ul className="mt-3 space-y-1.5">
              {amenities[key].map((item, index) => (
                <li key={`${item.name}-${index}`} className="truncate text-caption text-ink-muted">
                  {item.name}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/** Higher when the school is closer. Capped so a far school is not shown as a failing score. */
function proximityScore(distanceKm: number | null): number {
  if (distanceKm === null) return 7;
  const score = 9.2 - distanceKm * 0.18;
  return Math.round(Math.min(9.2, Math.max(6.1, score)) * 10) / 10;
}

function titleize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}
