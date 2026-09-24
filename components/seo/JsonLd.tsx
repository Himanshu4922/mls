/**
 * Structured data for search engines.
 *
 * Rendered as a native <script> (not next/script) per the Next 16 JSON-LD guide
 * (node_modules/next/dist/docs/01-app/02-guides/json-ld.md). `<` is escaped so a
 * listing description containing "</script>" cannot break out of the tag —
 * JSON.stringify alone does not protect against that.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Array<Record<string, unknown>> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

/** Absolute site origin for canonical URLs and structured data. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** BreadcrumbList from ordered [name, path] pairs. */
export function breadcrumbJsonLd(items: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
