import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { CompareView } from "@/components/property/CompareView";
import { MAX_COMPARE } from "@/lib/constants/compare";
import { getQueryClient, prefetchPropertiesByIds } from "@/lib/queries/server";

export const metadata: Metadata = {
  title: "Compare homes",
  description: "Compare up to three listings side by side.",
};

/**
 * `ids` in the URL is the source of truth, so a comparison is shareable and
 * survives a refresh. The rows are prefetched here and handed to TanStack
 * Query through a HydrationBoundary, so the first paint has data; after that
 * the tray, the "add more" picker and this page all read one cache — and a
 * removal re-renders from cache instead of re-fetching the whole set.
 *
 * Listing data only (no per-user keys), and the page reads searchParams, so
 * it renders per request.
 */
export default async function ComparePage({ searchParams }: PageProps<"/compare">) {
  const params = await searchParams;
  const raw = params.ids;
  const ids = Array.from(
    new Set(
      (Array.isArray(raw) ? raw.join(",") : (raw ?? ""))
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ).slice(0, MAX_COMPARE);

  const client = getQueryClient();
  await prefetchPropertiesByIds(client, ids);

  // The page chrome (sticky bar, background, CTA) lives in CompareView so the
  // header can reflect the live count as homes are added or removed.
  return (
    <HydrationBoundary state={dehydrate(client)}>
      <CompareView ids={ids} />
    </HydrationBoundary>
  );
}
