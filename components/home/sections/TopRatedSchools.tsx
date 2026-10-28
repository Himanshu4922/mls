import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { homesNearSchoolHref, type OfficialSchool } from "@/lib/api/schools";
import { textOf } from "@/lib/site/read";

const SOURCE_URL = "https://data.ontario.ca/dataset/school-information-and-student-demographics";
const LIVE_DESCRIPTION =
  "Published EQAO results for GTA secondary schools. The percentage is the average of Grade 9 math and the literacy test. These are school locations, not attendance boundaries.";

/**
 * Homepage school cards. Live pages pass Ministry results. The studio preview
 * has no school list, so it does not show the sample ratings stored on the section.
 *
 * Cards use a map tile of the school coordinates — the Ministry open file has
 * no building photos.
 */
export function TopRatedSchools({
  content,
  schools,
}: {
  content?: Record<string, unknown>;
  schools?: OfficialSchool[];
}) {
  const eyebrow = textOf(content, "eyebrow", "Schools & families");
  const title = "GTA Secondary Schools";

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
      {schools.length === 0 ? (
        <p className="text-small text-ink-muted">EQAO results are unavailable right now.</p>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {schools.map((school) => {
              const homesHref =
                school.latitude !== null && school.longitude !== null
                  ? homesNearSchoolHref(school.latitude, school.longitude)
                  : null;
              const place = [school.city, school.board].filter(Boolean).join(" · ");
              const imageAlt = place
                ? `Map of ${school.name} in ${place}`
                : `Map of ${school.name}`;
              const score =
                school.eqaoPercent === null ? "—" : `${school.eqaoPercent}%`;
              return (
                <article
                  key={school.id}
                  className="overflow-hidden rounded-surface border border-line bg-surface"
                >
                  {school.imageUrl ? (
                    <div className="relative h-28 bg-surface-alt">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={school.imageUrl}
                        alt={imageAlt}
                        width={640}
                        height={224}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-navy shadow"
                      />
                    </div>
                  ) : null}
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
            . Map tiles ©{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">
              OpenStreetMap
            </a>
            .
          </p>
        </>
      )}
    </Section>
  );
}
