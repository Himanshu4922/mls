/**
 * Canonical public paths, shared by pages, the sitemap and structured data.
 *
 * One builder per entity so the URL a crawler finds in the sitemap is exactly
 * the URL the page declares as canonical — a mismatch splits ranking signals
 * between two addresses for the same content.
 */

/** Lowercase, ASCII a-z0-9 words joined by single hyphens. */
export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

/**
 * `/preconstruction/{id}-{slug}`. The detail route resolves by the leading id;
 * the slug is for readers and search engines. Accepts either a backend slug or
 * a title (slugified here), and falls back to the bare id when neither yields
 * anything.
 */
export function preconPath(id: number | string, slugOrTitle?: string | null): string {
  const slug = slugOrTitle ? slugify(slugOrTitle) : "";
  return `/preconstruction/${id}${slug ? `-${slug}` : ""}`;
}

export function propertyPath(listingKey: string): string {
  return `/property/${encodeURIComponent(listingKey)}`;
}

export function blogPath(slug: string): string {
  return `/blog/${encodeURIComponent(slug)}`;
}
