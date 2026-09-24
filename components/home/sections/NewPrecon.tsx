import { PreconCard } from "@/components/precon/PreconCard";
import { Section } from "@/components/ui/Section";
import { LinkButton } from "@/components/ui/Button";
import { safeFetch } from "@/lib/api/client";
import { getPreconProjects } from "@/lib/api/preconstruction";

/**
 * "Invest Ahead / New Preconstruction Projects" (HomeAtlasUI HomePage
 * L375-437). LIVE via getPreconProjects, same as the old PreconRail; omitted
 * when the backend returns nothing. The reference's prev/next arrows were
 * non-functional decoration over a static grid and are not ported — the
 * "View All Projects" button is the way onward.
 */
export async function NewPrecon() {
  const { items } = await safeFetch(
    getPreconProjects({ limit: 3 }),
    { items: [], total: 0 },
    "home:precon",
  );
  if (items.length === 0) return null;

  return (
    <Section eyebrow="Invest ahead" title="New Preconstruction Projects">
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 3).map((project) => (
          <li key={project.id} className="h-full">
            <PreconCard project={project} headingLevel="h3" />
          </li>
        ))}
      </ul>

      <div className="mt-8 text-center">
        <LinkButton href="/preconstruction" variant="secondary" className="border-ink px-8">
          View All Projects
        </LinkButton>
      </div>
    </Section>
  );
}
