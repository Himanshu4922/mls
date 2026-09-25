import Link from "next/link";
import { AssignmentCard } from "@/components/assignments/AssignmentCard";
import { safeFetch } from "@/lib/api/client";
import { getPublicAssignments } from "@/lib/api/assignments";

/**
 * "Assignments in this project" rail for a pre-con page (scope #2e): approved
 * assignment sales linked to this project. Renders nothing when there are none.
 */
export async function ProjectAssignments({ projectId, projectTitle }: { projectId: number; projectTitle: string }) {
  const data = await safeFetch(
    getPublicAssignments({ preconProjectId: projectId, pageSize: 4 }),
    { count: 0, page: 1, pageSize: 4, results: [] },
    "precon:assignments",
  );
  if (data.results.length === 0) return null;

  return (
    <section className="mt-16" aria-labelledby="project-assignments-heading">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id="project-assignments-heading" className="text-h2 text-ink">
          Assignments in {projectTitle}
        </h2>
        {data.count > data.results.length && (
          <Link href="/assignments" className="text-small font-medium text-navy hover:underline">
            See all {data.count}
          </Link>
        )}
      </div>
      <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {data.results.map((listing) => (
          <li key={listing.id}>
            <AssignmentCard listing={listing} headingLevel="h3" />
          </li>
        ))}
      </ul>
    </section>
  );
}
