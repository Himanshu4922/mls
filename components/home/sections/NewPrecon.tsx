import { PreconCard } from "@/components/precon/PreconCard";
import { Section } from "@/components/ui/Section";
import { safeFetch } from "@/lib/api/client";
import { getPreconProjects } from "@/lib/api/preconstruction";

/**
 * "Invest Ahead / New Preconstruction Projects" (HomeAtlasUI HomePage
 * L375-437). LIVE via getPreconProjects: projects pinned in admin first, then
 * the most recently published, with sold-out projects left out. Omitted when
 * the backend returns nothing. The reference's prev/next arrows were
 * non-functional decoration over a static grid and are not ported — the
 * header's "View All Projects" link is the way onward.
 */
export async function NewPrecon() {
  const { items } = await safeFetch(
    getPreconProjects({
      limit: 3,
      params: { ordering: "featured", exclude_stage: "sold_out" },
    }),
    { items: [], total: 0 },
    "home:precon",
  );
  if (items.length === 0) return null;

  return (
    <Section
      eyebrow="Invest ahead"
      title="New Preconstruction Projects"
      action={{ label: "View All Projects", href: "/preconstruction" }}
    >
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 3).map((project) => (
          <li key={project.id} className="h-full">
            <PreconCard project={project} headingLevel="h3" />
          </li>
        ))}
      </ul>
    </Section>
  );
}
