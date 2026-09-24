"use client";

import { useState, useTransition } from "react";
import { cn } from "@/lib/utils/cn";
import { useWatched } from "@/components/providers/WatchedProvider";

/**
 * Favourite toggle.
 *
 * Optimistic locally, persisted through /api/watched (which proxies mls-v2's
 * `watched/favorites/toggle/`). Signed-out visitors keep favourites in local
 * storage; they merge on sign-in.
 */
export function SaveButton({
  listingKey,
  address,
  className,
  style,
  size = "md",
}: {
  listingKey: string;
  address: string;
  className?: string;
  /** Lets a 3D parent place this at a fixed depth. */
  style?: React.CSSProperties;
  size?: "sm" | "md";
}) {
  const { isFavorite, toggleFavorite } = useWatched();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const saved = isFavorite(listingKey);

  const dims = size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    /* Two spans, deliberately. The outer one takes ONLY the caller's classes:
       `cn` is a plain joiner with no conflict resolution, so a `relative` here
       would sit alongside the caller's `absolute` — and Tailwind emits
       `.relative` after `.absolute`, so it won and the heart drifted out of
       its corner. The inner span is the tooltip's positioning context. */
    <span className={cn("inline-flex", className)}>
      <span className="relative inline-flex">
      <button
      type="button"
      // No positioning class here: `cn` is a plain joiner with no conflict
      // resolution, so a hardcoded `relative` would beat a caller's `absolute`
      // (Tailwind emits `.relative` after `.absolute`, and source order wins).
      // Callers own placement; z-10 keeps this above the stretched link overlay.
      className={cn(
        // No z-index here either: callers place this relative to their own
        // overlays, and a baked-in z-10 only competes with the value they pass.
        //
        // The border is load-bearing: the card behind this is also white, so a
        // bg-surface pill with only a soft shadow was invisible against it.
        "flex items-center justify-center rounded-full border border-line bg-surface shadow-card",
        "hover:border-ink-subtle",
        // No hover:scale here: a 3D parent passes an inline transform for
        // depth, and that always beats a utility class — the scale would
        // silently never apply. Hover reads through colour instead.
        "transition-colors duration-150 hover:bg-surface-alt disabled:opacity-60",
        dims,
      )}
      style={style}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${address} from saved homes` : `Save ${address}`}
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const message = await toggleFavorite(listingKey);
          setError(message);
          // Auto-dismiss so a transient failure does not stick to the card.
          if (message) setTimeout(() => setError(null), 4000);
        })
      }
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 18 18"
        fill={saved ? "var(--color-gold)" : "none"}
        aria-hidden="true"
      >
        <path
          d="M1.5 7.125C1.5 5.41646 2.55333 3.88477 4.14871 3.2733C5.74408 2.66183 7.55129 3.09716 8.69325 4.368C8.77267 4.45292 8.88373 4.50111 9 4.50111C9.11627 4.50111 9.22733 4.45292 9.30675 4.368C10.4453 3.08865 12.257 2.64768 13.8562 3.26061C15.4554 3.87355 16.5082 5.41239 16.5 7.125C16.5 8.8425 15.375 10.125 14.25 11.25L10.131 15.2347C9.8483 15.5594 9.43972 15.747 9.00922 15.7497C8.57871 15.7525 8.16779 15.5701 7.881 15.249L3.75 11.25C2.625 10.125 1.5 8.85 1.5 7.125"
          stroke={saved ? "var(--color-gold)" : "currentColor"}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.5"
        />
      </svg>
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
    </span>
  );
}
