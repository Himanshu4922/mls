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
 * Catchment schools.
 *
 * Data comes from OpenStreetMap via mls-v2's `nearest-school/`. The reference
 * showed a rating out of 10 per school ("8.6") — OSM carries no such score and
 * no ratings provider is wired, so we show distance and type instead of
 * inventing a number. See API_GAPS G13.
 */
export function SchoolsSection({ schools }: { schools: NearbySchool[] }) {
  if (schools.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="text-h2 text-ink">Nearby schools</h2>
        <UnavailableNote className="mt-2">
          No school data is available for this location.
        </UnavailableNote>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="text-h2 text-ink">Nearby schools</h2>
      <p className="mt-1 text-caption text-ink-muted">
        Within 3 km, from OpenStreetMap. Confirm catchment with the school board.
      </p>

      <ul className="mt-4 divide-y divide-line-soft">
        {schools.slice(0, 6).map((school, index) => (
          <li
            key={`${school.name}-${index}`}
            className="flex items-baseline justify-between gap-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-small font-medium text-ink">{school.name}</p>
              <p className="truncate text-caption text-ink-muted">
                {[school.operator, school.kind ? titleize(school.kind) : null]
                  .filter(Boolean)
                  .join(" · ") || school.address || EMPTY}
              </p>
            </div>
            <span className="shrink-0 text-caption text-ink-muted">
              {school.distanceKm === null ? EMPTY : `${school.distanceKm.toFixed(1)} km`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Groceries / cafés / parks / transit within walking distance. */
export function AmenitiesSection({ amenities }: { amenities: AmenitiesByCategory }) {
  const groups = (Object.keys(AMENITY_LABELS) as AmenityCategory[]).filter(
    (key) => amenities[key].length > 0,
  );

  if (groups.length === 0) {
    return (
      <section className="mt-10">
        <h2 className="text-h2 text-ink">What&rsquo;s nearby</h2>
        <UnavailableNote className="mt-2">
          No amenity data is available for this location.
        </UnavailableNote>
      </section>
    );
  }

  return (
    <section className="mt-10">
      <h2 className="text-h2 text-ink">What&rsquo;s nearby</h2>
      <p className="mt-1 text-caption text-ink-muted">Within 1.5 km, from OpenStreetMap.</p>

      <div className="mt-4 grid gap-6 sm:grid-cols-2">
        {groups.map((key) => (
          <div key={key}>
            <h3 className="flex items-center gap-2 text-small font-semibold text-ink">
              {AMENITY_LABELS[key]}
              <Badge tone="neutral">{amenities[key].length}</Badge>
            </h3>
            <ul className="mt-2 space-y-1">
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

function titleize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
}
