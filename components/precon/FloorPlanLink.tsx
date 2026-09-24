"use client";

import { Spinner } from "@/components/ui/Button";
import { usePreconDocument } from "@/components/precon/usePreconDocument";

/**
 * Compact gated floor-plan trigger for a home-collection table row. Same gate
 * and popup handling as the action bar (see usePreconDocument).
 */
export function FloorPlanLink({ projectId, label }: { projectId: number; label: string }) {
  const { open, state, reset } = usePreconDocument(projectId);

  if (state.status === "ready") {
    return (
      <a
        href={state.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={reset}
        className="text-caption font-semibold text-navy underline underline-offset-2"
      >
        Open floor plan
      </a>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => open("floor_plan")}
        aria-label={label}
        disabled={state.status === "loading"}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-control border border-line px-2.5 py-1 text-caption font-medium text-ink transition-colors hover:border-navy hover:text-navy disabled:opacity-60"
      >
        {state.status === "loading" && <Spinner className="h-3 w-3" />}
        Floor plan
      </button>
      {state.status === "error" && (
        <span role="alert" className="max-w-[12rem] text-right text-caption text-negative">
          {state.message}
        </span>
      )}
    </span>
  );
}
