"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SchoolSearchBox } from "@/components/search/SchoolSearchBox";
import { Section } from "@/components/ui/Section";
import { homesNearSchoolHref, type OfficialSchool } from "@/lib/api/schools";
import { textOf } from "@/lib/site/read";
import { cn } from "@/lib/utils/cn";

const SOURCE_URL = "https://data.ontario.ca/dataset/school-information-and-student-demographics";
const LIVE_DESCRIPTION =
  "Search homes near a school families use for admission planning. EQAO % is the average of published Grade 9 math and literacy results. These are school locations — not board attendance boundaries.";

type LevelFilter = "all" | "secondary" | "elementary";

function matchesLevel(school: OfficialSchool, filter: LevelFilter): boolean {
  if (filter === "all") return true;
  const hay = `${school.level} ${school.kind} ${school.name}`.toLowerCase();
  if (filter === "secondary") {
    return /secondary|high school|collegiate|senior/.test(hay);
  }
  return /elementary|public school|primary|junior|intermediate/.test(hay) && !/secondary|high school/.test(hay);
}

/**
 * Homepage school explorer. Live pages pass Ministry results. The studio
 * preview has no school list, so it does not show the sample ratings stored
 * on the section.
 *
 * Cards use generic stock photos — the Ministry open file has no building
 * photos — and the footnote says so, so nobody takes one for the named school.
 */
export function TopRatedSchools({
  content,
  schools,
}: {
  content?: Record<string, unknown>;
  schools?: OfficialSchool[];
}) {
  const router = useRouter();
  const eyebrow = textOf(content, "eyebrow", "Schools & families");
  const title = textOf(content, "title", "Find homes by school");
  const [level, setLevel] = useState<LevelFilter>("all");

  const visible = useMemo(() => {
    if (!schools) return [];
    const filtered = schools.filter((school) => matchesLevel(school, level));
    return (filtered.length > 0 ? filtered : schools).slice(0, 8);
  }, [schools, level]);

  if (!schools) {
    return (
      <Section tone="alt" eyebrow={eyebrow} title={title} description={LIVE_DESCRIPTION}>
        <p className="text-small text-ink-muted">
          The public homepage loads these results from the Ministry of Education. Sample ratings are not shown.
        </p>
      </Section>
    );
  }

  return (
    <Section tone="alt" eyebrow={eyebrow} title={title} description={LIVE_DESCRIPTION}>
      <div className="mb-6 max-w-xl">
        <SchoolSearchBox
          onSelect={(school, km) => {
            router.push(
              homesNearSchoolHref(school.latitude, school.longitude, {
                km,
                name: school.name,
              }),
            );
          }}
        />
      </div>

      {schools.length === 0 ? (
        <p className="text-small text-ink-muted">EQAO results are unavailable right now.</p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <p className="mr-1 text-caption font-medium text-ink-muted">Browse top EQAO</p>
            {(
              [
                { value: "all", label: "All" },
                { value: "secondary", label: "Secondary" },
                { value: "elementary", label: "Elementary" },
              ] as const
            ).map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setLevel(chip.value)}
                className={cn(
                  "h-8 rounded-control border px-2.5 text-caption font-medium transition-colors",
                  level === chip.value
                    ? "border-navy bg-navy text-white"
                    : "border-line bg-surface text-ink hover:border-navy",
                )}
              >
                {chip.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {visible.map((school) => {
              const homesHref =
                school.latitude !== null && school.longitude !== null
                  ? homesNearSchoolHref(school.latitude, school.longitude, {
                      name: school.name,
                    })
                  : null;
              const place = [school.city, school.board].filter(Boolean).join(" · ");
              const score = school.eqaoPercent === null ? "—" : `${school.eqaoPercent}%`;
              return (
                <article
                  key={school.id}
                  className="overflow-hidden rounded-surface border border-line bg-surface"
                >
                  <div className="relative h-28 bg-surface-alt">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={school.imageUrl}
                      alt=""
                      width={640}
                      height={224}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="space-y-2 p-3.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-small font-semibold leading-snug text-ink">{school.name}</h3>
                        {place ? (
                          <p className="mt-0.5 truncate text-caption text-ink-muted">{place}</p>
                        ) : null}
                      </div>
                      <p
                        className="shrink-0 text-[22px] font-bold leading-none text-ink"
                        title={
                          school.eqaoPercent === null
                            ? "No EQAO result published"
                            : school.eqaoLabel
                        }
                      >
                        {score}
                      </p>
                    </div>
                    {homesHref ? (
                      <Link href={homesHref} className="inline-block text-caption font-medium text-navy hover:underline">
                        Homes within 2 km →
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mt-5 text-caption text-ink-muted">
            Ontario Ministry of Education, School information and student demographics, 2024–25.{" "}
            <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline">
              Open Government Licence – Ontario
            </a>
            . Photos are illustrative stock images, not the schools listed. Proximity is not
            catchment — confirm admission rules with the school board.
          </p>
        </>
      )}
    </Section>
  );
}
