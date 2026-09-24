"use client";

import { SafeImage } from "@/components/ui/SafeImage";
import Link from "next/link";
import { LinkButton } from "@/components/ui/Button";
import { COMPARE_ROWS } from "@/components/property/CompareTable";
import type { PropertyDetail } from "@/lib/types/domain";

/**
 * The one-home state.
 *
 * A single column in the comparison matrix is not a comparison — and rendering
 * it as a table stretched the photo across the full container. This shows the
 * home as a normal fixed-width card with an explicit slot for the next one, so
 * nothing is lost and the way forward is obvious.
 */
export function CompareSingle({
  property,
  onRemove,
  onAdd,
}: {
  property: PropertyDetail;
  onRemove: (listingKey: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-4">
      <p
        role="status"
        className="rounded-control border border-gold/30 bg-gold-soft px-4 py-3 text-small text-ink"
      >
        Add at least one more home to see them side by side.
      </p>

      <div className="flex flex-wrap items-stretch gap-4">
        {/* Same 260px column width the matrix uses, so adding a second home
            does not resize the first. */}
        <article className="w-full max-w-[280px] shrink-0 overflow-hidden rounded-surface border border-line bg-surface sm:w-[260px]">
          <div className="relative aspect-[4/3] w-full bg-surface-alt">
            <SafeImage
              src={property.image}
              alt={`Photo of ${property.address}`}
              fill
              sizes="260px"
              className="object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(property.id)}
              aria-label={`Remove ${property.address} from comparison`}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-surface text-ink-subtle shadow-card transition-colors hover:text-ink"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M18 6 6 18M6 6l12 12"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          <div className="p-4">
            <Link
              href={`/property/${encodeURIComponent(property.id)}`}
              className="block text-small font-medium text-ink hover:text-gold"
            >
              {property.address}
            </Link>

            {/* Same field set the matrix uses, so nothing disappears when the
                comparison drops to one home. */}
            <dl className="mt-3 divide-y divide-line-soft border-t border-line">
              {COMPARE_ROWS.map((row) => (
                <div key={row.label} className="flex justify-between gap-3 py-2">
                  <dt className="text-caption text-ink-muted">{row.label}</dt>
                  <dd className="text-caption font-medium text-ink">
                    {row.value(property)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </article>

        <button
          type="button"
          onClick={onAdd}
          className="flex w-full max-w-[280px] shrink-0 flex-col items-center justify-center gap-3 rounded-surface border border-dashed border-line p-6 sm:w-[260px] text-ink-muted transition-colors hover:border-navy hover:text-navy"
        >
          <span
            aria-hidden="true"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-current text-h2 leading-none"
          >
            +
          </span>
          <span className="text-small font-medium">Add a home to compare</span>
        </button>
      </div>

      <div>
        <LinkButton variant="secondary" size="md" href="/listings">
          Browse listings
        </LinkButton>
      </div>
    </div>
  );
}
