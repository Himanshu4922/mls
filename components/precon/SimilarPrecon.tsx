import { PreconCard } from "@/components/precon/PreconCard";
import { safeFetch } from "@/lib/api/client";
import { getSimilarPrecon } from "@/lib/api/preconstruction";

/**
 * "Similar projects" rail, matching the property page's SimilarHomes. Renders
 * nothing on error or an empty result — a recommendation rail is optional
 * content and must never break or pad out the page.
 */
export async function SimilarPrecon({ projectId }: { projectId: number }) {
  const similar = await safeFetch(getSimilarPrecon(projectId), [], "precon:similar");
  if (similar.length === 0) return null;

  return (
    <section className="mt-16" aria-labelledby="similar-precon-heading">
      <h2 id="similar-precon-heading" className="text-h2 text-ink">
        Similar projects
      </h2>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {similar.slice(0, 4).map((project) => (
          <li key={project.id}>
            <PreconCard project={project} headingLevel="h3" />
          </li>
        ))}
      </ul>
    </section>
  );
}
