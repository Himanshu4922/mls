import { PropertyCard } from "@/components/property/PropertyCard";
import { Section } from "@/components/ui/Section";
import { EmptyState } from "@/components/ui/States";
import { safeFetch } from "@/lib/api/client";
import {
  getExclusiveProperties,
  getFeaturedProperties,
  getNewlyListed,
} from "@/lib/api/properties";
import type { PropertySummary } from "@/lib/types/domain";

/**
 * "Curated for you / Featured MLS Listings" (HomeAtlasUI HomePage L295-352).
 *
 * LIVE: listings the team pinned in admin (`is_featured`), topped up by the
 * backend with the brokerage's exclusive listings. If that feed is empty or
 * unreachable (e.g. a backend without `featured-properties/`), falls back to
 * exclusive listings, then the newest, so the slot never renders empty; the
 * description stays honest about which one is showing.
 */
export async function FeaturedListings() {
  const featured = await safeFetch(
    getFeaturedProperties(3),
    { listings: [], pinnedCount: 0 },
    "home:featured",
  );
  let listings: PropertySummary[] = featured.listings;
  let description =
    featured.pinnedCount > 0
      ? "Hand-picked homes from the HomeAtlas team."
      : "Homes offered directly through HomeAtlas.";

  if (listings.length === 0) {
    listings = await safeFetch<PropertySummary[]>(
      getExclusiveProperties(3),
      [],
      "home:featured-exclusive",
    );
  }
  if (listings.length === 0) {
    listings = await safeFetch<PropertySummary[]>(
      getNewlyListed(3),
      [],
      "home:featured-newest",
    );
    description = "The newest homes on the market.";
  }

  return (
    <Section
      eyebrow="Curated for you"
      title="Featured MLS® Listings"
      description={description}
      action={{ label: "View All Listings", href: "/listings" }}
    >
      {listings.length === 0 ? (
        <EmptyState
          title="Listings are unavailable right now"
          description="We couldn't reach the listing service. Please try again shortly."
          action={{ label: "Browse listings", href: "/listings" }}
        />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {listings.slice(0, 3).map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </Section>
  );
}
