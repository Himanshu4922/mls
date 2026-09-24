import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Gallery } from "@/components/property/Gallery";
import { InquiryForm } from "@/components/property/InquiryForm";
import { ListingShareActions } from "@/components/property/ListingShareActions";
import { MortgageCalculator } from "@/components/property/MortgageCalculator";
import { AmenitiesSection, SchoolsSection } from "@/components/property/Neighbourhood";
import { PriceHistory } from "@/components/property/PriceHistory";
import { PropertyCard } from "@/components/property/PropertyCard";
import { PropertyNote } from "@/components/property/PropertyNote";
import { PropertyTabs } from "@/components/property/PropertyTabs";
import { SaveButton } from "@/components/property/SaveButton";
import { TouredButton } from "@/components/property/TouredButton";
import { ViewTracker } from "@/components/property/ViewTracker";
import { Badge } from "@/components/ui/Badge";
import { PropertyGridSkeleton, Skeleton, UnavailableNote } from "@/components/ui/States";
import { ApiError, safeFetch } from "@/lib/api/client";
import { getProperty, getSimilarProperties } from "@/lib/api/properties";
import {
  getNearbyAmenities,
  getNearbySchools,
  getPropertySnapshots,
} from "@/lib/api/neighbourhood";
import { statusLabel } from "@/lib/api/mappers";
import {
  EMPTY,
  formatLeasePrice,
  formatNumber,
  formatPrice,
} from "@/lib/utils/format";
import type { PropertyDetail } from "@/lib/types/domain";
import { absoluteUrl, JsonLd } from "@/components/seo/JsonLd";
import { propertyJsonLd } from "@/lib/seo/jsonld";
import { propertyPath } from "@/lib/seo/urls";

export const revalidate = 300;

/**
 * Returns null only when the backend genuinely reports the listing is missing.
 * A network/timeout failure (status 0 or 5xx) is re-thrown so the error
 * boundary shows "something went wrong" — telling a user the home does not
 * exist when the API is merely unreachable would be wrong.
 */
async function load(listingKey: string): Promise<PropertyDetail | null> {
  try {
    return await getProperty(decodeURIComponent(listingKey));
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound) return null;
    throw error;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/property/[listingKey]">): Promise<Metadata> {
  const { listingKey } = await params;

  /*
   * Metadata generation must not decide the route's fate. Swallowing every
   * failure here made a backend outage look like a missing listing, so we only
   * fall back to a plain title and let the page component below classify the
   * error (404 → not-found, anything else → the error boundary).
   */
  let property: PropertyDetail | null = null;
  try {
    property = await load(listingKey);
  } catch {
    return { title: "Listing unavailable" };
  }
  if (!property) return { title: "Listing not found" };

  const price = property.isLease
    ? formatLeasePrice(property.price)
    : formatPrice(property.price);

  return {
    title: `${property.address} — ${price}`,
    description:
      property.description?.slice(0, 155) ??
      `${property.beds ?? EMPTY} bed, ${property.baths ?? EMPTY} bath home in ${property.community ?? "the GTA"}.`,
    alternates: { canonical: propertyPath(property.id) },
    openGraph: property.image
      ? { images: [{ url: property.image }], title: property.address }
      : undefined,
  };
}

export default async function PropertyPage({
  params,
}: PageProps<"/property/[listingKey]">) {
  const { listingKey } = await params;
  const property = await load(listingKey);
  if (!property) notFound();

  const location = [property.neighbourhood, property.community, property.stateOrProvince]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="container-page py-8">
      <JsonLd data={propertyJsonLd(property)} />
      {/* Records the view for popularity counts and "Recently Viewed". */}
      <ViewTracker
        listingKey={property.id}
        snapshot={{
          address: property.address,
          price: property.price,
          city: property.community,
          image: property.image,
          beds: property.beds,
          baths: property.baths,
        }}
      />

      <nav aria-label="Breadcrumb" className="mb-5">
        <Link
          href="/listings"
          className="inline-flex items-center gap-1.5 text-small text-ink-muted transition-colors hover:text-ink"
        >
          <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <path
              d="M14.25 9H3.75M9 14.25L3.75 9L9 3.75"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Back to listings
        </Link>
      </nav>

      <Gallery images={property.images} address={property.address} />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={property.status === "sold" ? "negative" : "navy"}>
                  {statusLabel(property.status)}
                </Badge>
                {property.badge && property.badge.tone !== "sold" && (
                  <Badge tone="warm">{property.badge.label}</Badge>
                )}
              </div>

              <h1 className="mt-3 text-h1 text-ink">{property.address}</h1>
              <p className="mt-1 text-small text-ink-muted">{location || EMPTY}</p>
              <ListingShareActions
                className="mt-4"
                listingKey={property.id}
                address={property.address}
                url={absoluteUrl(propertyPath(property.id))}
                canCompare={property.status === "active"}
              />
            </div>

            <div className="flex items-start gap-3">
              <p className="text-display text-ink">
                {property.price === null
                  ? EMPTY
                  : property.isLease
                    ? formatLeasePrice(property.price)
                    : formatPrice(property.price)}
              </p>
              {property.status === "active" && (
                <SaveButton
                  listingKey={property.id}
                  address={property.address}
                  className="relative shrink-0"
                />
              )}
              {/* Not gated on status: a home can be toured after it sells. */}
              <TouredButton
                listingKey={property.id}
                className="shrink-0"
                snapshot={{
                  address: property.address,
                  price: property.price,
                  city: property.community,
                  image: property.image,
                  beds: property.beds,
                  baths: property.baths,
                }}
              />
            </div>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-surface border border-line bg-line sm:grid-cols-4">
            <KeyStat label="Bedrooms" value={property.beds === null ? EMPTY : formatNumber(property.beds)} />
            <KeyStat label="Bathrooms" value={property.baths === null ? EMPTY : formatNumber(property.baths)} />
            <KeyStat
              label="Interior"
              value={property.sqft === null ? EMPTY : `${formatNumber(property.sqft)} sq ft`}
            />
            <KeyStat label="Year built" value={property.yearBuilt === null ? EMPTY : String(property.yearBuilt)} />
          </dl>

          {/*
            Tabbed sections, following HomeAtlasUI's detail layout. Only tabs
            with a real data source are built: the reference also shipped
            Climate Risk and an "AI Estimate", both hardcoded sample values
            (a made-up flood percentage; price × 1.03), and mls-v2 supplies
            neither. Schools here are the real nearby-schools endpoint, not the
            reference's invented ratings.
          */}
          <div className="mt-10">
            <PropertyTabs
              tabs={[
                {
                  id: "overview",
                  label: "Overview",
                  content: (
                    <div className="space-y-10">
                      {property.description && (
                        <section>
                          <h2 className="text-h2 text-ink">About this home</h2>
                          <p className="mt-3 whitespace-pre-line text-body leading-relaxed text-ink-soft">
                            {property.description}
                          </p>
                        </section>
                      )}

                      {property.factGroups.map((group) => (
                        <section key={group.title}>
                          <h2 className="text-h2 text-ink">{group.title}</h2>
                          <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                            {group.facts.map((item) => (
                              <div
                                key={item.label}
                                className="flex justify-between gap-4 border-b border-line-soft pb-2"
                              >
                                <dt className="text-small text-ink-muted">{item.label}</dt>
                                <dd className="text-right text-small font-medium text-ink">
                                  {item.value}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </section>
                      ))}

                      {property.rooms.length > 0 && (
                        <section>
                          <h2 className="text-h2 text-ink">Rooms</h2>
                          <div className="mt-4 overflow-x-auto">
                            <table className="w-full min-w-[420px] border-collapse text-small">
                              <thead>
                                <tr className="border-b border-line text-left text-ink-muted">
                                  <th scope="col" className="py-2 pr-4 font-medium">Room</th>
                                  <th scope="col" className="py-2 pr-4 font-medium">Level</th>
                                  <th scope="col" className="py-2 font-medium">Dimensions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {property.rooms.map((room, index) => (
                                  <tr
                                    key={`${room.name}-${index}`}
                                    className="border-b border-line-soft"
                                  >
                                    <td className="py-2.5 pr-4 font-medium text-ink">
                                      {room.name}
                                    </td>
                                    <td className="py-2.5 pr-4 text-ink-muted">
                                      {room.level ?? EMPTY}
                                    </td>
                                    <td className="py-2.5 text-ink-muted">
                                      {room.dimensions ?? EMPTY}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </section>
                      )}
                    </div>
                  ),
                },
                {
                  id: "history",
                  label: "Listing history",
                  content: (
                    <Suspense fallback={<SectionSkeleton label="Loading price history" />}>
                      <PriceHistorySection listingKey={property.id} />
                    </Suspense>
                  ),
                },
                {
                  id: "neighbourhood",
                  label: "Neighbourhood",
                  available: property.latitude !== null && property.longitude !== null,
                  content: (
                    <Suspense
                      fallback={<SectionSkeleton label="Loading neighbourhood data" />}
                    >
                      <NeighbourhoodSections
                        latitude={property.latitude ?? 0}
                        longitude={property.longitude ?? 0}
                      />
                    </Suspense>
                  ),
                },
                {
                  id: "finance",
                  label: "Mortgage",
                  content: <MortgageCalculator price={property.price} />,
                },
                {
                  id: "notes",
                  label: "My notes",
                  content: <PropertyNote listingKey={property.id} />,
                },
              ]}
            />
          </div>

          <p className="mt-10 text-caption text-ink-subtle">
            MLS® {property.mls} · Listing data provided by the Canadian Real Estate
            Association. Information is deemed reliable but not guaranteed.
          </p>
        </div>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <InquiryForm listingKey={property.id} address={property.address} />

          {/*
            The reference showed walk/transit scores here. No backend or
            third-party source supplies them today (API_GAPS G5), so the section
            is omitted rather than filled with invented numbers.
          */}
          <UnavailableNote className="mt-4">
            Neighbourhood walk and transit scores are not yet available for this
            listing.
          </UnavailableNote>
        </aside>
      </div>

      <Suspense fallback={<PropertyGridSkeleton count={3} />}>
        <SimilarHomes listingKey={property.id} />
      </Suspense>
    </article>
  );
}

function KeyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface px-4 py-4">
      <dt className="text-caption text-ink-muted">{label}</dt>
      <dd className="mt-0.5 text-h3 text-ink">{value}</dd>
    </div>
  );
}

async function SimilarHomes({ listingKey }: { listingKey: string }) {
  const similar = await safeFetch(
    getSimilarProperties(listingKey),
    [],
    "property:similar",
  );
  if (similar.length === 0) return null;

  return (
    <section className="mt-16">
      <h2 className="text-h2 text-ink">Similar homes</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {similar.slice(0, 3).map((item) => (
          <PropertyCard key={item.id} property={item} />
        ))}
      </div>
    </section>
  );
}

async function PriceHistorySection({ listingKey }: { listingKey: string }) {
  const snapshots = await safeFetch(
    getPropertySnapshots(listingKey),
    [],
    "property:snapshots",
  );
  return <PriceHistory snapshots={snapshots} />;
}

/**
 * Schools and amenities share a coordinate pair, so they are fetched together
 * and stream in as one unit rather than blocking the main content.
 */
async function NeighbourhoodSections({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const [schools, amenities] = await Promise.all([
    safeFetch(getNearbySchools(latitude, longitude), [], "property:schools"),
    safeFetch(
      getNearbyAmenities(latitude, longitude),
      { groceries: [], cafes: [], parks: [], transit: [] },
      "property:amenities",
    ),
  ]);

  return (
    <>
      <SchoolsSection schools={schools} />
      <AmenitiesSection amenities={amenities} />
    </>
  );
}

function SectionSkeleton({ label }: { label: string }) {
  return (
    <div className="mt-10 space-y-3" role="status" aria-label={label}>
      <Skeleton className="h-7 w-48" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}
