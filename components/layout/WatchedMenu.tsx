"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { Menu } from "@/components/ui/Menu";
import { useUserKeys } from "@/components/providers/AuthProvider";
import { useWatched } from "@/components/providers/WatchedProvider";
import { notesListQuery } from "@/lib/queries/notes";
import { watchedOverviewQuery } from "@/lib/queries/watched";
import { WatchedMenuPanel } from "@/components/watched/WatchedMenuPanel";
import { cn } from "@/lib/utils/cn";

/**
 * Navbar "Watched" dropdown — HomeAtlasUI Navbar L124-204.
 *
 * A dialog-role <Menu>: the panel holds tabs and lists, which a menu role
 * would misdescribe. The Navbar keys this by pathname so it closes on route
 * change; links inside also close it on click, which covers same-path
 * navigations such as switching /watched tabs.
 */
export function WatchedMenu() {
  const { favorites } = useWatched();
  const queryClient = useQueryClient();
  const keys = useUserKeys();

  // Warm the panel on hover / keyboard focus so it opens populated (docs/06
  // Phase 4). Once per signed-in user; prefetchQuery also skips fresh keys.
  const prefetchedFor = useRef<number | null>(null);
  const prefetch = () => {
    if (!keys) return;
    const userId = keys.all[1];
    if (prefetchedFor.current === userId) return;
    prefetchedFor.current = userId;
    void queryClient.prefetchQuery(watchedOverviewQuery(keys));
    void queryClient.prefetchQuery(notesListQuery(keys));
  };

  return (
    <Menu
      role="dialog"
      label="Watched"
      panelClassName="w-[420px]"
      trigger={({ open, buttonProps }) => (
        <button
          type="button"
          {...buttonProps}
          onPointerEnter={prefetch}
          onFocus={prefetch}
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-control border px-4 text-small font-medium transition-colors",
            open ? "border-navy bg-navy text-white" : "border-line text-ink hover:border-navy",
          )}
        >
          <HeartGlyph />
          Watched
          {favorites.length > 0 && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[0.625rem] font-semibold",
                open ? "bg-white text-navy" : "bg-navy text-white",
              )}
            >
              {favorites.length}
              <span className="sr-only"> saved homes</span>
            </span>
          )}
          <svg
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className={cn("transition-transform", open && "rotate-180")}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.5"
            />
          </svg>
        </button>
      )}
    >
      {(close) => <WatchedMenuPanel close={close} />}
    </Menu>
  );
}

function HeartGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M1.5 7.125C1.5 5.41646 2.55333 3.88477 4.14871 3.2733C5.74408 2.66183 7.55129 3.09716 8.69325 4.368C8.77267 4.45292 8.88373 4.50111 9 4.50111C9.11627 4.50111 9.22733 4.45292 9.30675 4.368C10.4453 3.08865 12.257 2.64768 13.8562 3.26061C15.4554 3.87355 16.5082 5.41239 16.5 7.125C16.5 8.8425 15.375 10.125 14.25 11.25L10.131 15.2347C9.8483 15.5594 9.43972 15.747 9.00922 15.7497C8.57871 15.7525 8.16779 15.5701 7.881 15.249L3.75 11.25C2.625 10.125 1.5 8.85 1.5 7.125"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}
