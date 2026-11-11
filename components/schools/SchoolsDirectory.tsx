"use client";

import Link from "next/link";
import { useState } from "react";
import {
  homesNearSchoolHref,
  type OfficialSchool,
  type SchoolSearchHit,
  SCHOOL_SEARCH_MIN_CHARS,
} from "@/lib/api/schools";
import { useDebouncedValue } from "@/lib/hooks/useDebouncedValue";
import { useSchoolSearch } from "@/lib/queries/schools";
import { schoolLocationImageSrc } from "@/lib/utils/mapTile";

const SOURCE_URL = "https://data.ontario.ca/dataset/school-information-and-student-demographics";

function hitToSchool(hit: SchoolSearchHit): OfficialSchool {
  return {
    id: hit.id,
    name: hit.name,
    board: hit.board,
    kind: hit.kind,
    level: hit.level,
    city: hit.city,
    distanceKm: null,
    website: null,
    eqaoPercent: hit.eqaoPercent,
    eqaoLabel: hit.eqaoLabel,
    latitude: hit.latitude,
    longitude: hit.longitude,
    imageUrl: schoolLocationImageSrc(hit.latitude, hit.longitude),
  };
}

/**
 * Browse / search Ontario schools, then jump to homes near a selected school.
 */
export function SchoolsDirectory({ initialSchools }: { initialSchools: OfficialSchool[] }) {
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 300);
  const search = useSchoolSearch(debounced);
  const searching = debounced.trim().length >= SCHOOL_SEARCH_MIN_CHARS;
  const results = searching
    ? (search.data ?? []).map(hitToSchool)
    : initialSchools;
  const loading = searching && search.isFetching && !search.isPlaceholderData && !search.data;
  const emptySearch =
    searching && !search.isFetching && !search.isPlaceholderData && (search.data?.length ?? 0) === 0;

  return (
    <div className="space-y-8">
      <div className="max-w-xl">
        <label htmlFor="schools-directory-search" className="block text-small font-medium text-ink">
          Search by school name
        </label>
        <input
          id="schools-directory-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="e.g. John Fraser Secondary School"
          autoComplete="off"
          className="mt-1.5 h-12 w-full rounded-control border border-line bg-surface px-4 text-small text-ink outline-none placeholder:text-ink-subtle focus:border-navy"
        />
        <p className="mt-2 text-caption text-ink-muted">
          Results are school locations from the Ministry file — not board attendance
          boundaries. Living nearby does not guarantee admission.
        </p>
      </div>

      {loading ? (
        <p className="text-small text-ink-muted" role="status">
          Searching schools…
        </p>
      ) : null}

      {emptySearch ? (
        <p className="text-small text-ink-muted">
          No schools matched &ldquo;{debounced.trim()}&rdquo;. Try the full name or city.
        </p>
      ) : null}

      {!searching && initialSchools.length > 0 ? (
        <p className="text-caption font-medium text-ink-muted">
          Top EQAO secondary schools in the GTA — search above for any Ontario school.
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((school) => (
            <li key={school.id}>
              <SchoolResultCard school={school} />
            </li>
          ))}
        </ul>
      ) : null}

      {!searching && initialSchools.length === 0 ? (
        <p className="text-small text-ink-muted">EQAO results are unavailable right now. Try searching by name.</p>
      ) : null}

      <p className="text-caption text-ink-muted">
        Ontario Ministry of Education, School information and student demographics, 2024–25.{" "}
        <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline">
          Open Government Licence – Ontario
        </a>
        . Images are map tiles of each school&apos;s published location.
      </p>
    </div>
  );
}

function SchoolResultCard({ school }: { school: OfficialSchool }) {
  const homesHref =
    school.latitude !== null && school.longitude !== null
      ? homesNearSchoolHref(school.latitude, school.longitude, { name: school.name })
      : null;
  const place = [school.city, school.board].filter(Boolean).join(" · ");
  const meta = [school.level, school.kind].filter(Boolean).join(" · ");
  const score = school.eqaoPercent === null ? "—" : `${school.eqaoPercent}%`;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-surface border border-line bg-surface">
      <div className="relative h-32 bg-surface-alt">
        {school.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={school.imageUrl}
            alt=""
            width={640}
            height={256}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : null}
      </div>
      <div className="flex flex-1 flex-col space-y-2 p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-small font-semibold leading-snug text-ink">{school.name}</h2>
            {place ? <p className="mt-0.5 truncate text-caption text-ink-muted">{place}</p> : null}
            {meta ? <p className="truncate text-caption text-ink-muted">{meta}</p> : null}
          </div>
          <p
            className="shrink-0 text-[22px] font-bold leading-none text-ink"
            title={school.eqaoPercent === null ? "No EQAO result published" : school.eqaoLabel}
          >
            {score}
          </p>
        </div>
        {homesHref ? (
          <Link href={homesHref} className="mt-auto inline-block pt-1 text-caption font-medium text-navy hover:underline">
            Homes within 2 km →
          </Link>
        ) : null}
      </div>
    </article>
  );
}
