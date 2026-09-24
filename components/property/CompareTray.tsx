"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { useWatched } from "@/components/providers/WatchedProvider";
import { MAX_COMPARE } from "@/lib/constants/compare";
import { usePropertyLookup } from "@/lib/queries/properties";

/**
 * Sticky compare strip.
 *
 * Mounted once in the site layout so a selection survives navigation between
 * listings, the map and property pages — a shortlist is only useful if you can
 * gather homes from more than one screen.
 *
 * Hidden on /compare itself: the strip exists to get you TO the comparison, and
 * that page has its own remove / add-more / clear controls.
 */
export function CompareTray() {
  const router = useRouter();
  const pathname = usePathname();
  const { compare, compareLabels, toggleCompare, clearCompare } = useWatched();

  // Per-id lookup, so each pill resolves on its own: ticking a third home no
  // longer blanks the other two, and a home already seen on the listings page
  // renders its address straight from cache.
  const byId = usePropertyLookup(compare);

  const visible = compare.length > 0 && pathname !== "/compare";

  /*
   * Reserve space at the bottom of the document while the strip is up: it is
   * fixed, so otherwise it covers the footer and the last row of cards.
   *
   * The height is measured rather than hardcoded — the strip grows a hint line
   * and its pills wrap differently across breakpoints, so a fixed value was
   * either too small (content hidden) or too large (a visible gap).
   */
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = barRef.current;
    if (!visible || !node) return;

    const apply = () =>
      document.body.style.setProperty(
        "--compare-tray-height",
        `${node.offsetHeight}px`,
      );

    apply();
    const observer = new ResizeObserver(apply);
    observer.observe(node);
    document.body.classList.add("has-compare-tray");

    return () => {
      observer.disconnect();
      document.body.classList.remove("has-compare-tray");
      document.body.style.removeProperty("--compare-tray-height");
    };
  }, [visible]);

  if (!visible) return null;

  const ready = compare.length >= 2;

  return (
    <div
      ref={barRef}
      role="region"
      aria-label="Compare selection"
      className="fixed inset-x-0 bottom-0 z-[120] border-t border-white/10 bg-navy-deep text-white"
    >
      {/*
       * Three zones in one non-wrapping row: label | scrolling pills | actions.
       * The outer row deliberately does NOT wrap — when it did, the gold CTA
       * could reflow into the middle of the pill list. Overflow is absorbed by
       * the pill rail scrolling horizontally instead.
       */}
      <div className="container-page flex items-center gap-3 py-2.5 sm:gap-4 sm:py-3">
        <p className="flex shrink-0 items-center gap-2 text-small font-medium">
          {/* The word is redundant next to the count on a phone. */}
          <span className="hidden sm:inline">Compare</span>
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gold px-1.5 text-caption font-semibold text-ink">
            {compare.length}
          </span>
        </p>

        <ul
          className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Selected homes"
        >
          {compare.map((id) => {
            // The card supplied the address when it was ticked, so a new pill
            // labels itself with no network round-trip at all.
            const label = compareLabels[id] ?? byId.get(id)?.address ?? null;
            return (
              <li key={id} className="shrink-0">
                <span className="flex max-w-[12rem] items-center gap-1.5 rounded-full bg-white/10 py-1.5 pl-3 pr-1.5 text-caption sm:max-w-[15rem]">
                  {label ? (
                    <span className="truncate">{label}</span>
                  ) : (
                    /* Never show the raw listing key: until the query resolves
                       a placeholder bar stands in, so the pill does not flash
                       an id and then swap to the address. */
                    <span
                      aria-label="Loading address"
                      className="h-3 w-24 animate-pulse rounded-full bg-white/25"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => toggleCompare(id)}
                    aria-label={
                      label ? `Remove ${label} from comparison` : "Remove home from comparison"
                    }
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white/70 transition-colors hover:bg-white/15 hover:text-white"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M18 6 6 18M6 6l12 12"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </span>
              </li>
            );
          })}
        </ul>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button
            variant="accent"
            size="sm"
            className="sm:h-11 sm:px-5 sm:text-small"
            disabled={!ready}
            title={!ready ? "Select at least two homes to compare" : undefined}
            onClick={() => router.push(`/compare?ids=${compare.join(",")}`)}
          >
            <span className="hidden sm:inline">Compare Now&nbsp;→</span>
            <span className="sm:hidden">Compare</span>
          </Button>
          <button
            type="button"
            onClick={clearCompare}
            className="rounded-control px-2 py-2 text-caption text-white/70 transition-colors hover:bg-white/10 hover:text-white sm:px-3 sm:text-small"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Hints sit on their own line so they can never push the row wider. */}
      {!ready && (
        <p className="container-page pb-2 text-caption text-white/60">
          Select one more home to compare.
        </p>
      )}
      {compare.length === MAX_COMPARE && (
        <p className="container-page pb-2 text-caption text-white/60">
          That&rsquo;s the maximum of {MAX_COMPARE} homes — remove one to add another.
        </p>
      )}
    </div>
  );
}
