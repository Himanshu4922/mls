import Link from "next/link";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  assignmentPath,
  assignmentTitle,
  isOptimizableImage,
  type PublicListing,
} from "@/lib/api/assignments";
import { EMPTY, formatDate, formatNumber, formatPrice } from "@/lib/utils/format";

/** Card for the assignments index and the "Similar assignments" rails. */
export function AssignmentCard({
  listing,
  headingLevel = "h2",
}: {
  listing: PublicListing;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const photo = listing.photos[0] ?? null;
  const facts = [
    listing.propertyType,
    listing.beds !== null ? `${formatNumber(listing.beds)} bd` : null,
    listing.baths !== null ? `${formatNumber(listing.baths)} ba` : null,
    listing.sqft ? `${formatNumber(listing.sqft)} sq ft` : null,
  ].filter(Boolean);

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-surface border border-line bg-surface shadow-card transition-shadow hover:shadow-card-hover has-[a:focus-visible]:border-navy">
      <div className="relative h-[190px] bg-surface-alt">
        <p className="absolute left-3 top-3 z-10 rounded-full bg-gold px-3 py-1 text-caption font-medium text-ink">
          Assignment
        </p>
        <SafeImage
          src={photo}
          alt={`${assignmentTitle(listing)} photo`}
          fill
          sizes="(max-width: 640px) 100vw, 33vw"
          className="object-cover"
          unoptimized={photo ? !isOptimizableImage(photo) : undefined}
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <Heading className="text-h3 text-ink">
          <Link
            href={assignmentPath(listing)}
            className="outline-none before:absolute before:inset-0 before:rounded-surface group-hover:text-navy"
          >
            {assignmentTitle(listing)}
          </Link>
        </Heading>
        {listing.builderName && (
          <p className="mt-1 text-caption font-medium text-ink-soft">By {listing.builderName}</p>
        )}
        <p className="mt-1 text-caption text-ink-muted">{listing.city || EMPTY}</p>

        <p className="mt-3 text-h3 text-ink">{formatPrice(listing.askingPrice)}</p>
        {facts.length > 0 && <p className="mt-1 text-caption text-ink-muted">{facts.join(" · ")}</p>}
        {listing.occupancyDate && (
          <p className="mt-auto pt-3 text-caption text-ink-muted">
            Occupancy {formatDate(listing.occupancyDate)}
          </p>
        )}
      </div>
    </article>
  );
}
