import { absoluteUrl, breadcrumbJsonLd } from "@/components/seo/JsonLd";
import { propertyPath } from "@/lib/seo/urls";
import type { PropertyDetail } from "@/lib/types/domain";

/**
 * RealEstateListing + BreadcrumbList for a property page.
 *
 * Built here rather than inline so the page file only gains one element.
 */
export function propertyJsonLd(property: PropertyDetail): Array<Record<string, unknown>> {
  const path = propertyPath(property.id);
  const images = [
    ...(property.image ? [property.image] : []),
    ...property.images.map((image) => image.url),
  ].filter((url, index, all) => url && all.indexOf(url) === index).slice(0, 10);

  // Only a live listing is on offer; sold/leased records keep the listing
  // markup but advertise no purchasable offer.
  const availability =
    property.status === "active"
      ? "https://schema.org/InStock"
      : "https://schema.org/SoldOut";

  const listing: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: property.address,
    url: absoluteUrl(path),
    description: property.description?.slice(0, 500) ?? undefined,
    image: images.length > 0 ? images : undefined,
    datePosted: property.listedAt ?? undefined,
    offers:
      property.price !== null
        ? {
            "@type": "Offer",
            price: property.price,
            priceCurrency: "CAD",
            availability,
            url: absoluteUrl(path),
          }
        : undefined,
    contentLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        streetAddress: property.address,
        addressLocality: property.community ?? undefined,
        addressRegion: property.stateOrProvince ?? undefined,
        postalCode: property.postalCode ?? undefined,
        addressCountry: "CA",
      },
      geo:
        property.latitude !== null && property.longitude !== null
          ? {
              "@type": "GeoCoordinates",
              latitude: property.latitude,
              longitude: property.longitude,
            }
          : undefined,
    },
  };

  return [
    listing,
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Listings", path: "/listings" },
      { name: property.address, path },
    ]),
  ];
}
