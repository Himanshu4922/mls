import type { PreconProjectDetail } from "@/lib/api/preconstruction";
import { absoluteUrl, breadcrumbJsonLd } from "@/components/seo/JsonLd";
import { preconPath } from "@/lib/seo/urls";

/** Canonical path for a project; the sitemap uses the same `slug || title`. */
export function preconCanonical(project: { id: number; slug: string | null; title: string }): string {
  return preconPath(project.id, project.slug || project.title);
}

/**
 * Leading integer of a `/preconstruction/{id}-{slug}` segment, or null.
 * A bare "123" (the old URL shape) is accepted and redirected by the page.
 */
export function parsePreconSegment(segment: string): number | null {
  const match = /^(\d+)(?:-|$)/.exec(segment);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Description for meta tags: SEO meta, then excerpt, then a generated line. */
export function preconDescription(project: PreconProjectDetail): string {
  const plain = (value: string | null) =>
    value
      ?.replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim() || null;
  return (
    project.seoDescription ??
    plain(project.excerpt) ??
    [
      `${project.title}${project.developer ? ` by ${project.developer}` : ""}`,
      project.address ?? project.location,
      "Preconstruction project: floor plans, pricing and incentives.",
    ]
      .filter(Boolean)
      .join(" — ")
  ).slice(0, 300);
}

/**
 * Residence (a Place: name, address, geo) + Offer + BreadcrumbList.
 * schema.org has no "preconstruction project" type. Residence has no `offers`
 * property, so the Offer is its own node pointing at it via `itemOffered`, and
 * is only emitted with a real numeric price.
 */
export function preconJsonLd(project: PreconProjectDetail) {
  const url = absoluteUrl(preconCanonical(project));
  const residence: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Residence",
    name: project.title,
    url,
    description: preconDescription(project),
  };
  if (project.images.length > 0) residence.image = project.images.slice(0, 5);
  if (project.address || project.location) {
    residence.address = {
      "@type": "PostalAddress",
      streetAddress: project.address ?? undefined,
      addressLocality: project.location ?? undefined,
      addressCountry: "CA",
    };
  }
  if (project.latitude !== null && project.longitude !== null) {
    residence.geo = {
      "@type": "GeoCoordinates",
      latitude: project.latitude,
      longitude: project.longitude,
    };
  }
  residence["@id"] = `${url}#residence`;

  const offer = project.price
    ? {
        "@context": "https://schema.org",
        "@type": "Offer",
        price: project.price,
        priceCurrency: "CAD",
        url,
        itemOffered: { "@id": `${url}#residence` },
        ...(project.developer ? { seller: { "@type": "Organization", name: project.developer } } : {}),
      }
    : null;

  return [
    residence,
    ...(offer ? [offer] : []),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: "Preconstruction", path: "/preconstruction" },
      { name: project.title, path: preconCanonical(project) },
    ]),
  ];
}
