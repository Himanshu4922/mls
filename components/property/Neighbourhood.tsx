"use client";

import Link from "next/link";
import { useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { UnavailableNote } from "@/components/ui/States";
import {
  homesNearSchoolHref,
  type OfficialSchool,
} from "@/lib/api/schools";
import {
  AMENITY_LABELS,
  type AmenitiesByCategory,
  type AmenityCategory,
} from "@/lib/api/neighbourhood";
import { EMPTY } from "@/lib/utils/format";

/**
 * Schools near a listing, from the Ontario Ministry of Education open file.
 * The percentage is the average of published EQAO subject results. It is not
 * a ranking, and the file does not include the board's attendance boundary.
 */
export function SchoolsSection({ schools }: { schools: OfficialSchool[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? schools : schools.slice(0, 5);

  if (schools.length === 0) {
    return (
      <section>
        <h2 className="text-[20px] font-semibold text-ink">Schools near this home</h2>
        <UnavailableNote className="mt-3">
          No Ministry of Education school record is available for this location.
        </UnavailableNote>
      </section>
    );
  }

  return (
    <section>
      <h2 className="mb-2 text-[20px] font-semibold text-ink">Schools near this home</h2>
      <p className="mb-5 text-[13px] text-ink-muted">
        From the Ministry of Education school file for 2024–25. The percentage is the average of
        published EQAO results — the share of students who met the provincial standard. Attendance
        boundaries are set by the school board and are not in this file.
      </p>
      <ul className="space-y-4">
        {visible.map((school) => {
          const meta = [school.level, school.kind, school.board].filter(Boolean).join(" · ");
          const homesHref =
            school.latitude !== null && school.longitude !== null
              ? homesNearSchoolHref(school.latitude, school.longitude)
              : null;
          return (
            <li key={school.id} className="rounded-xl border border-line p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-ink">{school.name}</p>
                  <p className="mt-0.5 text-[12px] text-ink-muted">{meta || school.city || "School"}</p>
                  {school.city ? <p className="mt-0.5 text-[12px] text-ink-muted">{school.city}</p> : null}
                </div>
                <div className="shrink-0 text-right">
                  {school.eqaoPercent === null ? (
                    <p className="text-[12px] text-ink-muted">No EQAO result published</p>
                  ) : (
                    <>
                      <div className="mb-1">
                        <span className="text-[20px] font-bold text-ink">{school.eqaoPercent}%</span>
                      </div>
                      <p className="max-w-[12rem] text-[12px] text-ink-muted">{school.eqaoLabel}</p>
                    </>
                  )}
                  <p className="mt-0.5 text-[12px] text-ink-muted">
                    {school.distanceKm === null ? EMPTY : `${school.distanceKm.toFixed(1)} km away`}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                {homesHref ? (
                  <Link href={homesHref} className="text-[12px] font-medium text-navy hover:underline">
                    Homes within 2 km →
                  </Link>
                ) : null}
                {school.website ? (
                  <a href={school.website} target="_blank" rel="noopener noreferrer" className="text-[12px] font-medium text-navy hover:underline">
                    School website
                  </a>
                ) : null}
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
          {expanded ? "Show fewer schools" : "Show more schools"}
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
