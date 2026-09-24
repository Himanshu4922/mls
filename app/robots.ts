import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/components/seo/JsonLd";
import { sitemapIds } from "@/lib/seo/sitemap";

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
 * Next does not generate an index for `generateSitemaps`, so every child
 * sitemap (/sitemap/{id}.xml) is listed here instead.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const ids = await sitemapIds();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/api/", "/studio", "/watched", "/compare", "/verify-email"],
    },
    sitemap: ids.map((id) => absoluteUrl(`/sitemap/${id}.xml`)),
  };
}
