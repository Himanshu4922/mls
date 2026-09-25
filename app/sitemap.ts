import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/components/seo/JsonLd";
import { getAllBlogPosts } from "@/lib/api/blog";
import { getAllPreconForSitemap, getListingKeysPage } from "@/lib/api/sitemap";
import { listingsPageFromId, sitemapIds } from "@/lib/seo/sitemap";
import { blogPath, preconPath, propertyPath } from "@/lib/seo/urls";

/*
 * Split sitemaps, served at /sitemap/{id}.xml (see lib/seo/sitemap.ts for the
 * id list and why robots.txt enumerates them). Every section catches backend
 * failures and returns what it has: a crawler hitting a 500 sitemap drops it,
 * while a short one is simply refreshed next time.
 */
export const revalidate = 3600;

const STATIC_PATHS: Array<{ path: string; priority: number; changeFrequency: "daily" | "weekly" }> = [
  { path: "/", priority: 1, changeFrequency: "daily" },
  { path: "/listings", priority: 0.9, changeFrequency: "daily" },
  { path: "/map-search", priority: 0.8, changeFrequency: "daily" },
  { path: "/preconstruction", priority: 0.8, changeFrequency: "daily" },
  { path: "/market-trends", priority: 0.7, changeFrequency: "weekly" },
  { path: "/communities", priority: 0.7, changeFrequency: "weekly" },
  { path: "/blog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/sell", priority: 0.5, changeFrequency: "weekly" },
  { path: "/home-evaluation", priority: 0.5, changeFrequency: "weekly" },
  { path: "/recently-sold", priority: 0.6, changeFrequency: "daily" },
  { path: "/site-map", priority: 0.3, changeFrequency: "weekly" },
];

export async function generateSitemaps() {
  return (await sitemapIds()).map((id) => ({ id }));
}

/** ISO string → Date, or undefined for missing/garbage values. */
function toDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? undefined : at;
}

export default async function sitemap(props: {
  id: Promise<string>;
}): Promise<MetadataRoute.Sitemap> {
  const id = await props.id;

  if (id === "static") {
    return STATIC_PATHS.map((entry) => ({
      url: absoluteUrl(entry.path),
      changeFrequency: entry.changeFrequency,
      priority: entry.priority,
    }));
  }

  if (id === "blog") {
    const posts = await getAllBlogPosts().catch(() => []);
    return posts
      .filter((post) => !post.noindex)
      .map((post) => ({
        url: absoluteUrl(blogPath(post.slug)),
        lastModified: toDate(post.updatedAt ?? post.publishedAt),
        changeFrequency: "monthly" as const,
        priority: 0.5,
      }));
  }

  if (id === "precon") {
    const projects = await getAllPreconForSitemap().catch(() => []);
    return projects.map((project) => ({
      url: absoluteUrl(preconPath(project.id, project.slug || project.title)),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  }

  const page = listingsPageFromId(id);
  if (page !== null) {
    try {
      const { results } = await getListingKeysPage(page);
      return results.map((row) => ({
        url: absoluteUrl(propertyPath(row.listingKey)),
        lastModified: toDate(row.modified),
        changeFrequency: "daily" as const,
        priority: 0.7,
      }));
    } catch {
      return [];
    }
  }

  return [];
}
