"use client";

import dynamic from "next/dynamic";
import { Spinner } from "@/components/ui/Button";
import type { PreconProject } from "@/lib/api/preconstruction";

/** Leaflet reads `window` at import, and `ssr: false` needs a Client Component. */
const PreconMapSearch = dynamic(
  () => import("@/components/map/PreconMapSearch").then((mod) => mod.PreconMapSearch),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[calc(100vh-72px)] items-center justify-center gap-3 bg-surface-alt">
        <Spinner className="text-navy" />
        <span className="text-small text-ink-muted">Loading map…</span>
      </div>
    ),
  },
);

export function PreconMapSearchClient({ projects }: { projects: PreconProject[] }) {
  return <PreconMapSearch projects={projects} />;
}
