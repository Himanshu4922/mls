"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export type ListingView = "grid" | "list";

/**
 * Grid / list / map switch.
 *
 * Grid and list write `?view=` to the URL rather than local state, so the
 * choice survives a refresh, a shared link and the back button — the same
 * reason the filters live in the URL.
 *
 * Map is a route, not a view: it needs the full viewport, so it links to
 * /map-search carrying the active filters rather than trying to render a map
 * inside this page's column.
 */
export function ViewToggle({ view }: { view: ListingView }) {
  const router = useRouter();
  const params = useSearchParams();

  const setView = (next: ListingView) => {
    const query = new URLSearchParams(params.toString());
    // "grid" is the default; keeping it out of the URL keeps links clean.
    if (next === "grid") query.delete("view");
    else query.set("view", next);
    router.push(`/listings?${query.toString()}`, { scroll: false });
  };

  /*
   * The map reads the same filter params as this page (lib/utils/searchParams),
   * so the active search carries over. Only `view` and `page` are dropped —
   * they describe this grid, not the search.
   */
  const mapQuery = new URLSearchParams(params.toString());
  mapQuery.delete("view");
  mapQuery.delete("page");
  const mapQs = mapQuery.toString();
  const mapHref = mapQs ? `/map-search?${mapQs}` : "/map-search";

  return (
    <div
      role="group"
      aria-label="Result view"
      className="flex items-center overflow-hidden rounded-control border border-line"
    >
      <Option
        label="Grid view"
        active={view === "grid"}
        onClick={() => setView("grid")}
      >
        <GridIcon />
      </Option>
      <span className="h-6 w-px bg-line" aria-hidden="true" />
      <Option
        label="List view"
        active={view === "list"}
        onClick={() => setView("list")}
      >
        <ListIcon />
      </Option>
      <span className="h-6 w-px bg-line" aria-hidden="true" />
      <Option label="Map search" href={mapHref} active={false}>
        <MapIcon />
      </Option>
    </div>
  );
}

function Option({
  label,
  active,
  onClick,
  href,
  children,
}: {
  label: string;
  active: boolean;
  onClick?: () => void;
  href?: string;
  children: React.ReactNode;
}) {
  const className = cn(
    "flex h-10 w-11 items-center justify-center transition-colors",
    active ? "bg-ink text-white" : "bg-surface text-ink-muted hover:bg-surface-alt hover:text-ink",
  );

  if (href) {
    return (
      <a href={href} title={label} aria-label={label} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={className}
    >
      {children}
    </button>
  );
}

function GridIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect x="2" y="2" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="2" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="2" y="10.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <rect x="10.5" y="10.5" width="5.5" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M6 4h10M6 9h10M6 14h10"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="2.75" cy="4" r="1" fill="currentColor" />
      <circle cx="2.75" cy="9" r="1" fill="currentColor" />
      <circle cx="2.75" cy="14" r="1" fill="currentColor" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M2.5 4.5 6.5 2.75l5 2 4-1.75v10l-4 1.75-5-2-4 1.75v-10Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M6.5 2.75v10M11.5 4.75v10" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
