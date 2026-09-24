"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Tabbed sections on the property detail page, following HomeAtlasUI's layout.
 *
 * The reference also shipped Schools, Climate Risk and Estimates tabs. Those
 * are hardcoded sample data in the reference — invented school ratings, a
 * made-up flood percentage, and an "AI estimate" computed as price × 1.03 —
 * and mls-v2 has no source for any of them. Presenting invented school scores
 * or flood risk beside a real address would be misleading, so those tabs are
 * omitted until real data exists rather than shipped as decoration.
 *
 * Tabs are client state, not URL state: unlike the listings view toggle, which
 * changes what results you are looking at, these only reveal detail about one
 * property that is already loaded.
 */
export interface PropertyTab {
  id: string;
  label: string;
  /** Hidden entirely when false — an empty tab is worse than no tab. */
  available?: boolean;
  content: ReactNode;
}

export function PropertyTabs({ tabs }: { tabs: PropertyTab[] }) {
  const visible = tabs.filter((tab) => tab.available !== false);
  const [active, setActive] = useState(visible[0]?.id);

  if (visible.length === 0) return null;

  const current = visible.find((tab) => tab.id === active) ?? visible[0];

  return (
    <div>
      <div
        role="tablist"
        aria-label="Property details"
        className="flex gap-1 overflow-x-auto border-b border-line [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visible.map((tab) => {
          const selected = tab.id === current.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`panel-${tab.id}`}
              onClick={() => setActive(tab.id)}
              className={cn(
                "shrink-0 border-b-2 px-4 py-3 text-small font-medium transition-colors",
                selected
                  ? "border-navy text-navy"
                  : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/*
        Several panel sections (price history, neighbourhood, mortgage, notes)
        carry their own `mt-10` from when they were stacked down one long page.
        Inside a panel that margin is dead space at the top, so the first child
        has it removed here rather than editing each component and changing how
        it looks anywhere else it is used.
      */}
      <div
        role="tabpanel"
        id={`panel-${current.id}`}
        aria-labelledby={`tab-${current.id}`}
        className="pt-6 [&>*:first-child]:mt-0 [&>section:first-child]:mt-0"
      >
        {current.content}
      </div>
    </div>
  );
}
