"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/AuthProvider";
import { qk } from "@/lib/queries/keys";
import {
  useToggleToured,
  useWatchedOverview,
  watchedOverviewQuery,
} from "@/lib/queries/watched";
import { cn } from "@/lib/utils/cn";
import type { WatchedSnapshot } from "@/lib/api/watched";

/**
 * "Toured" marker on the property page, beside <SaveButton>.
 *
 * State lives in the shared watched overview (no separate request); the
 * mutation patches that cache optimistically and revalidates it afterwards.
 * While a toggle is in flight the button shows the requested state from the
 * mutation variables, so it responds even if the overview has not loaded.
 */
export function TouredButton({
  listingKey,
  snapshot,
  className,
}: {
  listingKey: string;
  /** Stored with the entry so the Toured list renders without refetching. */
  snapshot: WatchedSnapshot;
  className?: string;
}) {
  const { user, openAuth } = useAuth();
  const queryClient = useQueryClient();
  const overview = useWatchedOverview(Boolean(user));
  const mutation = useToggleToured();
  const [error, setError] = useState<string | null>(null);

  const stored = Boolean(
    overview.data?.toured.some((entry) => entry.propertyKey === listingKey),
  );
  const toured = mutation.isPending ? mutation.variables.toured : stored;

  function toggle(next: boolean) {
    setError(null);
    mutation.mutate(
      { propertyKey: listingKey, snapshot, toured: next },
      {
        onError: (err) => {
          setError(err.message);
          setTimeout(() => setError(null), 4000);
        },
      },
    );
  }

  function onClick() {
    if (user) {
      toggle(!toured);
      return;
    }
    openAuth("login", () => {
      // The backend only toggles, so read the account's list first: if this
      // home was already marked on another device, toggling would unmark it.
      // Runs after sign-in, so read the new user from the cache, not the
      // (signed-out) closure.
      const signedIn = queryClient.getQueryData<{ id: number } | null>(qk.auth.me);
      if (!signedIn) return;
      void queryClient
        .fetchQuery({ ...watchedOverviewQuery(qk.me(signedIn.id)), staleTime: 0 })
        .then((data) => {
          if (!data.toured.some((entry) => entry.propertyKey === listingKey)) toggle(true);
        })
        .catch(() => setError("Could not mark this home as toured."));
    });
  }

  return (
    <span className={cn("relative inline-flex", className)}>
      <button
        type="button"
        aria-pressed={toured}
        disabled={mutation.isPending}
        onClick={onClick}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-caption font-medium shadow-card transition-colors disabled:opacity-60",
          toured
            ? "border-navy bg-navy text-white hover:bg-navy-deep"
            : "border-line bg-surface text-ink hover:border-ink-subtle hover:bg-surface-alt",
        )}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {toured ? (
            <path d="m5 12.5 4.5 4.5L19 7.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          ) : (
            <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          )}
        </svg>
        {toured ? "Toured" : "Mark toured"}
      </button>
      {error && (
        <span
          role="alert"
          className="pointer-events-none absolute right-0 top-full z-20 mt-1.5 w-max max-w-[13rem] rounded-control bg-ink px-2.5 py-1.5 text-caption text-white shadow-pop"
        >
          {error}
        </span>
      )}
    </span>
  );
}
