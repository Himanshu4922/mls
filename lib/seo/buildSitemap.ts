import { absoluteUrl } from "@/components/seo/JsonLd";
import { assignmentPath, getPublicAssignments, type PublicListing } from "@/lib/api/assignments";
import { getAllBlogPosts } from "@/lib/api/blog";
import { getAllPreconForSitemap, getListingKeysPage } from "@/lib/api/sitemap";
import { CURATED_PAGES, curatedPath } from "@/lib/seo/curatedPages";
import { listingsPageFromId } from "@/lib/seo/sitemap";
import { blogPath, preconPath, propertyPath } from "@/lib/seo/urls";

/*
 * One section of the sitemap, served at /sitemap/{id}.xml.
 * A backend failure returns what we have: a crawler that gets a 500 drops
 * the file, while a short one is refreshed on the next request.
 */

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
  { path: "/assignments", priority: 0.7, changeFrequency: "daily" },
  { path: "/site-map", priority: 0.3, changeFrequency: "weekly" },
  { path: "/about", priority: 0.4, changeFrequency: "weekly" },
  { path: "/contact", priority: 0.4, changeFrequency: "weekly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "weekly" },
  { path: "/terms", priority: 0.2, changeFrequency: "weekly" },
  { path: "/cookies", priority: 0.2, changeFrequency: "weekly" },
];

export interface SitemapEntry {
  url: string;
  lastModified?: Date;
  changeFrequency?: "daily" | "weekly" | "monthly";
  priority?: number;
}

function toDate(value: string | null | undefined): Date | undefined {
  if (!value) return undefined;
  const at = new Date(value);
  return Number.isNaN(at.getTime()) ? undefined : at;
}

export async function buildSitemap(id: string): Promise<SitemapEntry[]> {
  if (id === "static") {
    return [
      ...STATIC_PATHS.map((entry) => ({
        url: absoluteUrl(entry.path),
        changeFrequency: entry.changeFrequency,
        priority: entry.priority,
      })),
      ...CURATED_PAGES.map((page) => ({
        url: absoluteUrl(curatedPath(page)),
        changeFrequency: "daily" as const,
        priority: 0.6,
      })),
    ];
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

  if (id === "assignments") {
    const rows: PublicListing[] = [];
    for (let page = 1; page <= 40; page++) {
      const data = await getPublicAssignments({ page, pageSize: 48 }).catch(() => null);
      if (!data || data.results.length === 0) break;
      rows.push(...data.results);
      if (rows.length >= data.count) break;
    }
    return rows.map((listing) => ({
      url: absoluteUrl(assignmentPath(listing)),
      lastModified: toDate(listing.publishedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
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

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function sitemapToXml(entries: SitemapEntry[]): string {
  const urls = entries
    .map((entry) => {
      const lastMod = entry.lastModified
        ? `<lastmod>${entry.lastModified.toISOString()}</lastmod>`
        : "";
      const freq = entry.changeFrequency ? `<changefreq>${entry.changeFrequency}</changefreq>` : "";
      const priority = entry.priority != null ? `<priority>${entry.priority}</priority>` : "";
      return `  <url><loc>${escapeXml(entry.url)}</loc>${lastMod}${freq}${priority}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}
