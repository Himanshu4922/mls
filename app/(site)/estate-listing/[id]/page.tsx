import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { InquiryForm } from "@/components/property/InquiryForm";
import { Gallery } from "@/components/property/Gallery";
import { getPublicEstateListing } from "@/lib/api/estateListings";
import { estateListingPath } from "@/lib/seo/urls";
import { EMPTY, formatNumber, formatPrice } from "@/lib/utils/format";
import type { PropertyImage } from "@/lib/types/domain";

export const revalidate = 60;

type PageProps = { params: Promise<{ id: string }> };

async function load(idParam: string) {
  const id = Number(idParam);
  if (!Number.isFinite(id) || id <= 0) return null;
  return getPublicEstateListing(id);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const listing = await load((await params).id);
  if (!listing) return { title: "Listing not found", robots: { index: false, follow: false } };
  const title = listing.title;
  const description =
    listing.description.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160) ||
    [listing.address, listing.city].filter(Boolean).join(", ");
  const path = estateListingPath(listing.id);
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title,
      description,
      url: path,
      images: listing.images[0] ? [{ url: listing.images[0] }] : undefined,
    },
  };
}

export default async function EstateListingPage({ params }: PageProps) {
  const listing = await load((await params).id);
  if (!listing) notFound();

  const images: PropertyImage[] = listing.images.map((url, index) => ({
    url,
    category: null,
    isPreferred: index === 0,
  }));

  const priceLabel = listing.enablePricePlaceholder
    ? listing.pricePlaceholder || "Contact for price"
    : listing.listPrice !== null
      ? `${listing.pricePrefix ? `${listing.pricePrefix} ` : ""}${formatPrice(listing.listPrice)}${listing.afterPrice ? ` ${listing.afterPrice}` : ""}`
      : EMPTY;

  const location = [listing.address, listing.city, listing.stateOrProvince, listing.postalCode]
    .filter(Boolean)
    .join(", ");

  return (
    <article className="container-page py-6 sm:py-8">
      <nav aria-label="Breadcrumb" className="mb-4">
        <Link href="/listings" className="text-small text-ink-muted hover:text-ink">
          ← Back to listings
        </Link>
      </nav>

      <div className="mb-6 sm:mb-8">
        <Gallery images={images} address={listing.address || listing.title} />
      </div>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-8">
          <header>
            <p className="text-caption font-medium uppercase tracking-wider text-navy">Brokerage listing</p>
            <p className="mt-2 text-[1.75rem] font-semibold leading-tight text-ink sm:text-[2rem]">{priceLabel}</p>
            <h1 className="mt-1 text-h2 text-ink">{listing.title}</h1>
            <p className="mt-1 text-small text-ink-muted">{location || EMPTY}</p>
            <dl className="mt-4 flex flex-wrap gap-2">
              {listing.bedrooms !== null && <Fact label="Beds" value={formatNumber(listing.bedrooms)} />}
              {listing.bathrooms !== null && <Fact label="Baths" value={formatNumber(listing.bathrooms)} />}
              {listing.buildingArea !== null && (
                <Fact label="Size" value={`${formatNumber(listing.buildingArea)} ${listing.sizePostfix || "sqft"}`} />
              )}
              {listing.propertyType && <Fact label="Type" value={listing.propertyType} />}
              {listing.standardStatus && <Fact label="Status" value={listing.standardStatus} />}
            </dl>
          </header>

          {listing.description ? (
            <section className="space-y-3">
              <h2 className="text-h3 text-ink">About this home</h2>
              <div
                className="prose prose-sm max-w-none text-ink-soft"
                dangerouslySetInnerHTML={{ __html: listing.description }}
              />
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-h3 text-ink">Details</h2>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[
                ["Listing key", listing.listingKey],
                ["Reference", listing.listingId || null],
                ["Lot size", listing.lotSize || null],
                ["Year built", listing.yearBuilt !== null ? String(listing.yearBuilt) : null],
                ["Garages", listing.garages !== null ? formatNumber(listing.garages) : null],
                ["Basement", listing.basement || null],
                ["Taxes", listing.taxAnnualAmount !== null ? formatPrice(listing.taxAnnualAmount) : null],
                ["Builder", listing.developer || null],
                ["Tags", listing.customTags || null],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label as string} className="rounded-control bg-surface-alt px-4 py-3">
                    <dt className="text-caption text-ink-muted">{label}</dt>
                    <dd className="mt-0.5 text-small font-medium text-ink">{value}</dd>
                  </div>
                ))}
            </dl>
          </section>

          <p className="text-caption text-ink-subtle">
            This is a HomeAtlas brokerage listing, not an MLS® feed property. Confirm all details before you buy or lease.
          </p>
        </div>

        <aside className="lg:sticky lg:top-28 lg:h-fit">
          <InquiryForm
            listingKey={`estate-${listing.id}`}
            address={listing.address || listing.title}
            variant="precon"
          />
        </aside>
      </div>
    </article>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-xl bg-surface-alt px-4 py-2.5 text-[14px]">
      <span className="font-semibold text-ink">{value}</span>
      <span className="text-[12px] text-ink-muted">{label}</span>
    </div>
  );
}
