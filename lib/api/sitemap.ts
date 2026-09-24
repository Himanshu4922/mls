/**
 * Readers for app/sitemap.ts.
 *
 * Listings come from `properties/sitemap-keys/` (mls/views_sitemap.py), which
 * returns only `listing_key` + `modified` for Active listings, 10k per page.
 * Paging the full `properties/filter/` serializer instead costs ~57s per 100
 * rows on the dev DB — far too slow for a crawler-facing route.
 *
 * Pre-con rows are read raw (id / title / slug) rather than through the
 * preconstruction mapper so the sitemap does not depend on that mapper's shape.
 */

import { apiFetch } from "@/lib/api/client";

/** Backend page size for sitemap-keys; must match SITEMAP_PAGE_SIZE. */
export const LISTING_KEYS_PAGE_SIZE = 10000;

export interface ListingKeysPage {
  count: number;
  page: number;
  pageSize: number;
  results: Array<{ listingKey: string; modified: string | null }>;
}

/** Sitemaps are rebuilt at most hourly; listing churn doesn't need faster. */
const REVALIDATE = 3600;

export async function getListingKeysPage(
  page: number,
  options: { countOnly?: boolean } = {},
): Promise<ListingKeysPage> {
  const data = await apiFetch<{
    count?: number;
    page?: number;
    page_size?: number;
    results?: Array<{ listing_key?: string | null; modified?: string | null }>;
  }>("/api/mls/properties/sitemap-keys/", {
    revalidate: REVALIDATE,
    params: { page, count_only: options.countOnly ? 1 : undefined },
  });
  return {
    count: data.count ?? 0,
    page: data.page ?? page,
    pageSize: data.page_size ?? LISTING_KEYS_PAGE_SIZE,
    results: (data.results ?? [])
      .filter((row): row is { listing_key: string; modified?: string | null } =>
        Boolean(row.listing_key),
      )
      .map((row) => ({ listingKey: row.listing_key, modified: row.modified ?? null })),
  };
}

export interface PreconSitemapRow {
  id: number;
  title: string | null;
  slug: string | null;
}

/**
 * Every published pre-con project, 200 per request. Stops at the first failed
 * page and returns what it has — a partial sitemap beats none.
 */
export async function getAllPreconForSitemap(maxPages = 50): Promise<PreconSitemapRow[]> {
  const rows: PreconSitemapRow[] = [];
  for (let page = 1; page <= maxPages; page++) {
    try {
      const data = await apiFetch<{
        count?: number;
        next?: string | null;
        results?: Array<{ id?: number; title?: string | null; slug?: string | null }>;
      }>("/api/mls/precon-properties/", {
        revalidate: REVALIDATE,
        params: { page_size: 200, page },
      });
      const results = data.results ?? [];
      for (const row of results) {
        if (typeof row.id === "number") {
          rows.push({ id: row.id, title: row.title ?? null, slug: row.slug ?? null });
        }
      }
      const total = data.count ?? 0;
      if (results.length === 0 || rows.length >= total || data.next === null) break;
    } catch {
      break;
    }
  }
  return rows;
}
