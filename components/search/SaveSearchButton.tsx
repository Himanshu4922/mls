"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { fromBackendParams, searchIdentity } from "@/lib/api/savedSearches";
import type { ListingQuery } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";
import { SaveSearchModal } from "./SaveSearchModal";
import { useSavedSearch } from "@/lib/queries/savedSearches";

/**
 * "Save search" toolbar action (HomeAtlasUI ListingsPage L234-244). Turns navy
 * with a check when the page on screen IS the saved search, so the user can
 * tell at a glance whether there is anything new to save.
 *
 * Signed-out visitors get the sign-in dialog, and the save dialog opens right
 * after they sign in rather than making them click again.
 */
export function SaveSearchButton({
  query,
  className,
}: {
  query: ListingQuery;
  className?: string;
}) {
  const { user, openAuth } = useAuth();
  const { saved } = useSavedSearch();
  const [open, setOpen] = useState(false);

  const isSaved = saved !== null && searchIdentity(fromBackendParams(saved.filters)) === searchIdentity(query);

  const onClick = () => {
    if (!user) {
      openAuth("login", () => setOpen(true));
      return;
    }
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-haspopup="dialog"
        className={cn(
          "inline-flex h-11 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-control px-4 text-small font-medium transition-colors",
          isSaved
            ? "bg-navy text-white hover:bg-navy-deep"
            : "border border-line bg-surface text-ink hover:border-navy hover:text-navy",
          className,
        )}
      >
        {isSaved ? (
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M3.75 9.75 7.5 13.5l6.75-9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path d="M9 1.5v15M1.5 9h15" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
          </svg>
        )}
        {isSaved ? "Search saved" : "Save search"}
      </button>
      {open && <SaveSearchModal query={query} onClose={() => setOpen(false)} />}
    </>
  );
}
