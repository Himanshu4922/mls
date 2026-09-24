import Link from "next/link";
import { communityImage } from "@/components/communities/CommunityCard";
import { SafeImage } from "@/components/ui/SafeImage";
import { Section } from "@/components/ui/Section";
import { Skeleton } from "@/components/ui/States";
import { safeFetch } from "@/lib/api/client";
import { getCommunityImages } from "@/lib/api/home";
import { getBulkCatalogStats } from "@/lib/api/market";
import { formatNumber, formatPrice } from "@/lib/utils/format";

/**
 * Trending communities — HomeAtlasUI "Discover the GTA" (HomePage L234-293).
 *
 * Data is LIVE from `catalog-stats/bulk/` (API_GAPS G4), ranked by active
 * inventory; cities with zero active listings are dropped. The figures shown
 * are the live count and the live MEDIAN list price (the backend has no
 * average, so the reference's "avg." wording is not reused).
 *
 * Tile photos come from `/api/home/community-images/` (admin-curated, keyed
 * by lower-cased city). A city without one borrows the reference's photo from
 * lib/home/sampleData (decorative only — no sample numbers are shown); any
 * other city, or a photo that fails to load, gets the shared placeholder.
 */
const SECTION = {
  tone: "alt",
  eyebrow: "Discover the GTA",
  title: "Trending Communities",
  action: { label: "View All", href: "/communities" },
} as const;

const RAIL =
  "flex snap-x snap-mandatory gap-5 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

export async function TrendingCommunities() {
  const [rows, communityImages] = await Promise.all([
    // Tiles show no sold figures, so skip the slow AMPRE sold lookup.
    safeFetch(getBulkCatalogStats({ gta: true, includeSold: false }), [], "home:communities"),
    getCommunityImages(),
  ]);

  const trending = rows
    .filter((row) => row.city && row.activeCount > 0)
    .sort((a, b) => b.activeCount - a.activeCount)
    .slice(0, 8);

  if (trending.length === 0) return null;

  return (
    <Section {...SECTION}>
      <ul className={RAIL}>
        {trending.map((row) => {
          const image = communityImage(row.city, communityImages);
          return (
            <li key={row.city} className="shrink-0 snap-start">
              <Link
                href={`/listings?city=${encodeURIComponent(row.city)}`}
                className="group relative flex h-72 w-48 flex-col justify-end overflow-hidden rounded-control bg-linear-to-br from-navy to-navy-deep p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
              >
                <SafeImage
                  src={image}
                  alt=""
                  fill
                  sizes="192px"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
                {/* Reference scrim: rgba(21,21,21,0.45), lightening on hover. */}
                <span
                  aria-hidden="true"
                  className="absolute inset-0 bg-ink/45 transition-colors group-hover:bg-ink/35"
                />
                <span className="relative text-h2 text-white">{row.city}</span>
                <span className="relative mt-1 text-caption text-white/75">
                  {formatNumber(row.activeCount)}{" "}
                  {row.activeCount === 1 ? "listing" : "listings"}
                  {row.medianListPrice
                    ? ` · ${formatPrice(row.medianListPrice)} median`
                    : ""}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute bottom-5 right-5 flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path
                      d="M5.83333 14.1667L14.1667 5.83333M14.1667 5.83333H5.83333M14.1667 5.83333V14.1667"
                      stroke="currentColor"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="1.67"
                    />
                  </svg>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

/**
 * Loading state with the section's real outline: same heading, and a rail of
 * 192×288 tiles, so nothing shifts when the data streams in.
 */
export function TrendingCommunitiesSkeleton() {
  return (
    <Section {...SECTION}>
      <div className={RAIL} role="status" aria-label="Loading trending communities">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-72 w-48 shrink-0" />
        ))}
      </div>
    </Section>
  );
}
