"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { PropertyBadgePill } from "@/components/ui/Badge";
import { SafeImage } from "@/components/ui/SafeImage";
import { SaveButton } from "@/components/property/SaveButton";
import type { PropertySummary } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";
import { EMPTY, formatLeasePrice, formatNumber, formatPrice } from "@/lib/utils/format";

const propertyHref = (id: string) => `/property/${encodeURIComponent(id)}`;

/** Sold homes lead with what they sold for, as on <PropertyCard>. */
function headlinePrice(property: PropertySummary): string {
  const value =
    property.status === "sold" && property.closePrice !== null ? property.closePrice : property.price;
  if (value === null) return EMPTY;
  return property.isLease ? formatLeasePrice(value) : formatPrice(value);
}

function specs(property: PropertySummary): string {
  return [
    property.beds === null ? null : `${formatNumber(property.beds)} bd`,
    property.baths === null ? null : `${formatNumber(property.baths)} ba`,
    property.sqft ? `${formatNumber(property.sqft)} sq ft` : null,
    property.type,
  ]
    .filter(Boolean)
    .join(" · ");
}

function location(property: PropertySummary): string {
  return [property.neighbourhood, property.community].filter(Boolean).join(", ") || EMPTY;
}

/**
 * One row of the map's results list: photo, price, address and specs.
 *
 * The whole row opens the listing (a stretched link, so it stays one real
 * anchor for middle-click and screen readers); save and "show on map" sit
 * above that link. `active` mirrors the pin highlight in both directions.
 */
export const MapListingCard = forwardRef<
  HTMLElement,
  {
    property: PropertySummary;
    active: boolean;
    onActivate: () => void;
    onShowOnMap: (() => void) | null;
  }
>(function MapListingCard({ property, active, onActivate, onShowOnMap }, ref) {
  const { id, address, image, badge, photosCount, status } = property;
  const price = headlinePrice(property);
  const details = specs(property);

  return (
    <article
      ref={ref}
      onMouseEnter={onActivate}
      onFocus={onActivate}
      className={cn(
        "group relative flex gap-3 border-b border-line-soft px-5 py-3 transition-colors",
        "has-[a:focus-visible]:bg-surface-alt",
        active ? "bg-surface-alt" : "hover:bg-surface-alt/60",
      )}
    >
      <div className="relative h-[84px] w-28 shrink-0 overflow-hidden rounded-control bg-surface-alt">
        <SafeImage
          src={image}
          alt={`Photo of ${address}`}
          fill
          sizes="112px"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
        {photosCount > 1 && (
          <span className="absolute bottom-1 right-1 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
            {photosCount} photos
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-small font-semibold text-ink">{price}</p>
          {badge && <PropertyBadgePill badge={badge} className="shrink-0" />}
        </div>
        <h3 className="mt-0.5 truncate text-small text-ink">
          <Link
            href={propertyHref(id)}
            aria-label={`${address}, ${price}`}
            className="outline-none before:absolute before:inset-0 group-hover:text-navy"
          >
            {address}
          </Link>
        </h3>
        <p className="mt-0.5 truncate text-caption text-ink-muted">{location(property)}</p>
        {details && <p className="mt-1 truncate text-caption text-ink-muted">{details}</p>}
      </div>

      {/* z-10 lifts these above the stretched link covering the row. */}
      <div className="z-10 flex shrink-0 flex-col items-end gap-2">
        {status === "active" && <SaveButton listingKey={id} address={address} size="sm" />}
        {onShowOnMap && (
          <button
            type="button"
            onClick={onShowOnMap}
            aria-label={`Show ${address} on the map`}
            title="Show on map"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-surface text-ink-muted shadow-card transition-colors hover:border-navy hover:text-navy"
          >
            <PinIcon />
          </button>
        )}
      </div>
    </article>
  );
});

/**
 * Preview of a clicked pin, docked over the map, so a price label can be
 * checked without hunting for its row in the list.
 */
export function MapPreviewCard({
  property,
  onClose,
}: {
  property: PropertySummary;
  onClose: () => void;
}) {
  const price = headlinePrice(property);
  const details = specs(property);

  return (
    <div className="animate-fade-up absolute bottom-4 left-4 z-[400] w-[min(340px,calc(100%-5.5rem))] overflow-hidden rounded-surface border border-line bg-surface shadow-pop">
      <article className="group relative flex">
        <div className="relative w-28 shrink-0 self-stretch bg-surface-alt">
          <SafeImage
            src={property.image}
            alt={`Photo of ${property.address}`}
            fill
            sizes="112px"
            className="object-cover"
          />
        </div>
        <div className="min-w-0 flex-1 py-3 pl-3 pr-9">
          <p className="text-small font-semibold text-ink">{price}</p>
          <h3 className="mt-0.5 truncate text-small text-ink">
            <Link
              href={propertyHref(property.id)}
              aria-label={`${property.address}, ${price}`}
              className="outline-none before:absolute before:inset-0 group-hover:text-navy"
            >
              {property.address}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-caption text-ink-muted">{location(property)}</p>
          {details && <p className="mt-1 truncate text-caption text-ink-muted">{details}</p>}
          <p className="mt-1.5 text-caption font-medium text-navy">View details →</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close preview"
          className="absolute right-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-alt hover:text-ink"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </button>
      </article>
    </div>
  );
}

function PinIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M9 16.5s5.25-4.5 5.25-9a5.25 5.25 0 1 0-10.5 0c0 4.5 5.25 9 5.25 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="7.5" r="1.9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}
