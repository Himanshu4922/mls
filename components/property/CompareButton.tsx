"use client";

import { cn } from "@/lib/utils/cn";
import { useWatched } from "@/components/providers/WatchedProvider";
import { MAX_COMPARE } from "@/lib/constants/compare";

/**
 * Compare toggle for a listing card.
 *
 * Deliberately not a heart: saving and comparing are different intents. Saving
 * is long-term interest kept on the account; comparing is a short-lived
 * shortlist of at most three homes, held locally and surfaced by the strip.
 *
 * Two looks over one behaviour:
 * - `overlay` — pill over a card photo (the reference card layout)
 * - `inline`  — bordered action beside Share / WhatsApp on the detail page
 *   (HomeAtlasUI PropertyDetailPage "+ Compare" / "✓ Comparing")
 * The selected state uses the same navy the rest of the UI uses for "active".
 */
export function CompareButton({
  listingKey,
  address,
  variant = "overlay",
  className,
}: {
  listingKey: string;
  address: string;
  variant?: "overlay" | "inline";
  className?: string;
}) {
  const { isComparing, toggleCompare, compareFull } = useWatched();
  const selected = isComparing(listingKey);
  // A full shortlist must still allow deselecting what is already in it.
  const blocked = compareFull && !selected;

  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={blocked}
      title={blocked ? `You can compare up to ${MAX_COMPARE} homes at once` : undefined}
      aria-label={
        selected
          ? `Remove ${address} from comparison`
          : blocked
            ? `Comparison is full at ${MAX_COMPARE} homes`
            : `Add ${address} to comparison`
      }
      onClick={() => toggleCompare(listingKey, address)}
      className={cn(
        "flex items-center gap-1.5 text-caption font-medium transition-colors duration-150",
        variant === "overlay"
          ? cn(
              "rounded-full px-3 py-1.5 shadow-card",
              selected
                ? "bg-navy text-white hover:bg-navy-deep"
                : "bg-surface/95 text-ink backdrop-blur-sm hover:bg-surface",
              blocked && "cursor-not-allowed opacity-60 hover:bg-surface/95",
            )
          : cn(
              "h-9 rounded-control border px-3.5",
              selected
                ? "border-navy bg-navy text-white hover:bg-navy-deep"
                : "border-line bg-surface text-ink hover:border-navy hover:text-navy",
              blocked && "cursor-not-allowed opacity-60 hover:border-line hover:text-ink",
            ),
        className,
      )}
    >
      {!selected && variant === "inline" && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M6 2v8M2 6h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      )}
      {selected && (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path
            d="M2 6.2 4.6 8.8 10 3.4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {selected && variant === "inline" ? "Comparing" : "Compare"}
    </button>
  );
}
