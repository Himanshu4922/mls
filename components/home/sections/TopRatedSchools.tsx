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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {schools.map((school) => {
              const homesHref =
                school.latitude !== null && school.longitude !== null
                  ? homesNearSchoolHref(school.latitude, school.longitude)
                  : null;
              return (
                <article
                  key={school.id}
                  className="flex flex-col rounded-surface border border-line bg-surface p-5"
                >
                  <h3 className="text-small font-semibold text-ink">{school.name}</h3>
                  <p className="mt-1 text-caption text-ink-muted">
                    {[school.city, school.board].filter(Boolean).join(" · ")}
                  </p>
                  <p className="mt-4 text-[28px] font-bold leading-none text-ink">
                    {school.eqaoPercent === null ? "—" : `${school.eqaoPercent}%`}
                  </p>
                  <p className="mt-2 flex-1 text-caption text-ink-muted">
                    {school.eqaoPercent === null ? "No EQAO result published" : school.eqaoLabel}
                  </p>
                  {homesHref ? (
                    <Link href={homesHref} className="mt-4 text-small font-medium text-navy hover:underline">
                      Homes within 2 km →
                    </Link>
                  ) : null}
                </article>
              );
            })}
          </div>
          <p className="mt-5 text-caption text-ink-muted">
            Ontario Ministry of Education, School information and student demographics, 2024–25.{" "}
            <a href={SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline">
              Open Government Licence – Ontario
            </a>
            .
          </p>
        </>
      )}
    </Section>
  );
}
