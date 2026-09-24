import type { Metadata } from "next";
import { Suspense } from "react";
import { PreconCard } from "@/components/precon/PreconCard";
import { Eyebrow } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/States";
import { safeFetch } from "@/lib/api/client";
import { getPreconProjects, type PreconProject } from "@/lib/api/preconstruction";

export const metadata: Metadata = {
  title: "Preconstruction projects",
  description:
    "Explore new preconstruction condo and home projects across the Greater Toronto Area.",
  alternates: { canonical: "/preconstruction" },
};

export const revalidate = 300;

export default function PreconstructionPage() {
  return (
    <>
      <section className="border-b border-line bg-surface-alt py-8 sm:py-12">
        <div className="container-page">
          <Eyebrow>New developments</Eyebrow>
          <h1 className="mt-3 text-h1 text-ink">Preconstruction projects</h1>
          <p className="mt-2 max-w-2xl text-small text-ink-muted">
            New builds across the GTA, from early registration through to final release.
          </p>
        </div>
      </section>

      <div className="container-page py-10">
        <Suspense fallback={<ProjectsSkeleton />}>
          <Projects />
        </Suspense>
      </div>
    </>
  );
}

async function Projects() {
  const { items } = await safeFetch(
    getPreconProjects({ limit: 24 }),
    { items: [] as PreconProject[], total: 0 },
    "precon:list",
  );

  if (items.length === 0) {
    return (
      <EmptyState
        title="No projects available"
        description="There are no published preconstruction projects right now. Check back soon."
        action={{ label: "Browse resale listings", href: "/listings" }}
      />
    );
  }

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((project) => (
        <li key={project.id}>
          <PreconCard project={project} />
        </li>
      ))}
    </ul>
  );
}

function ProjectsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading projects">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-surface border border-line">
          <Skeleton className="h-[190px] rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
