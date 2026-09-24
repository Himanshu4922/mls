import { PropertyCard } from "@/components/property/PropertyCard";
import { Section } from "@/components/ui/Section";
import { EmptyState } from "@/components/ui/States";
import { safeFetch } from "@/lib/api/client";
import { getExclusiveProperties, getNewlyListed } from "@/lib/api/properties";
import type { PropertySummary } from "@/lib/types/domain";

/**
 * "Curated for you / Featured MLS Listings" (HomeAtlasUI HomePage L295-352).
 *
 * LIVE: the brokerage's exclusive listings (same endpoint as the old
 * ExclusiveRail). When there are none, falls back to the newest listings so
 * the slot never renders empty; the heading stays honest either way.
 */
export async function FeaturedListings() {
  let listings = await safeFetch<PropertySummary[]>(
    getExclusiveProperties(3),
    [],
    "home:featured-exclusive",
  );
  const isFallback = listings.length === 0;
  if (isFallback) {
    listings = await safeFetch<PropertySummary[]>(
      getNewlyListed(3),
      [],
      "home:featured-newest",
    );
  }

  return (
    <Section
      eyebrow="Curated for you"
      title="Featured MLS® Listings"
      description={
        isFallback ? "The newest homes on the market." : "Homes offered directly through HomeAtlas."
      }
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
