import { SafeImage } from "@/components/ui/SafeImage";
import Link from "next/link";
import { salesStageLabel, type PreconProject } from "@/lib/api/preconstruction";
import { preconPath } from "@/lib/seo/urls";
import { EMPTY, formatNumber, formatPrice } from "@/lib/utils/format";

/**
 * Project card for the pre-con index and the "Similar projects" rail.
 * `headingLevel` lets the rail nest it under its own h2.
 */
export function PreconCard({
  project,
  headingLevel = "h2",
}: {
  project: PreconProject;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const stage = salesStageLabel(project.salesStage);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-surface border border-line bg-surface shadow-card transition-shadow hover:shadow-card-hover has-[a:focus-visible]:border-navy">
      <div className="relative h-[190px] bg-surface-alt">
        {/* Sales stage (G9) — omitted entirely when the brokerage
            hasn't set one, rather than shown as an empty chip. */}
        {stage && (
          <p className="absolute left-3 top-3 z-10 rounded-full bg-navy px-3 py-1 text-caption font-medium text-white">
            {stage}
          </p>
        )}
        <SafeImage
          src={project.image}
          alt={`${project.title} rendering`}
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <Heading className="text-h3 text-ink">
          {/* Stretched link: the whole card is clickable, but only the
              title is the accessible link name. */}
          <Link
            href={preconPath(project.id, project.slug || project.title)}
            className="outline-none before:absolute before:inset-0 before:rounded-surface group-hover:text-navy"
          >
            {project.title}
          </Link>
        </Heading>
        {project.developer && (
          <p className="mt-1 text-caption font-medium text-ink-soft">By {project.developer}</p>
        )}
        {project.address && (
          <p className="mt-1 text-caption text-ink-muted">{project.address}</p>
        )}

        <p className="mt-3 text-small text-ink-muted">
          Starting from{" "}
          <span className="font-semibold text-ink">
            {project.price ? formatPrice(project.price) : EMPTY}
          </span>
        </p>

        <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-caption text-ink-muted">
          {project.bedrooms !== null && (
            <div>
              <dt className="sr-only">Bedrooms</dt>
              <dd>{formatNumber(project.bedrooms)} bd</dd>
            </div>
          )}
          {project.bathrooms !== null && (
            <div>
              <dt className="sr-only">Bathrooms</dt>
              <dd>{formatNumber(project.bathrooms)} ba</dd>
            </div>
          )}
          {project.area !== null && (
            <div>
              <dt className="sr-only">Area</dt>
              <dd>{formatNumber(project.area)} sq ft</dd>
            </div>
          )}
        </dl>
      </div>
    </article>
  );
}
