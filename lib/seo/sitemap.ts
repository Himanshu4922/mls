import { getListingKeysPage } from "@/lib/api/sitemap";

/**
 * Child sitemap ids, shared by app/sitemap.ts (`generateSitemaps`) and
 * app/robots.ts.
 *
 * Next serves each id at `/sitemap/{id}.xml` and does NOT emit a sitemap
 * index, so robots.txt lists every child URL instead — both files must agree
 * on the list, hence this one source.
 *
 * One listings sitemap per backend page (10k keys): well under Google's 50k
 * cap, and each child renders from a single request. If the count request
 * fails, listing sitemaps are omitted for this revalidation rather than
 * advertising empty ones.
 */
export async function sitemapIds(): Promise<string[]> {
  const ids = ["static", "blog", "precon"];
  try {
    // count_only: the rows aren't needed to decide how many children exist.
    const first = await getListingKeysPage(1, { countOnly: true });
    const pages = Math.ceil(first.count / Math.max(first.pageSize, 1));
    for (let index = 0; index < pages; index++) ids.push(`listings-${index}`);
  } catch {
    // Backend down: static/blog/precon still go out.
  }
  return ids;
}

/** `listings-3` → backend page 4; anything else → null. */
export function listingsPageFromId(id: string): number | null {
  const match = /^listings-(\d+)$/.exec(id);
  return match ? Number(match[1]) + 1 : null;
}
