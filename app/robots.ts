import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/components/seo/JsonLd";

export const revalidate = 3600;

/**
 * robots.txt.
 *
 * `/_next` is deliberately NOT disallowed (the old frontend did): crawlers
 * need the CSS/JS to render pages, and blocking it hurts indexing.
 *
 * Private or per-user surfaces are disallowed; they carry no search value and
 * `/compare` URLs are infinite permutations of listing ids.
 *
 * The index at /sitemap.xml lists every child (/sitemap/{id}.xml).
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/studio", "/watched", "/compare", "/verify-email"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
