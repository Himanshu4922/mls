import type { Metadata } from "next";
import { Suspense } from "react";
import { CommunityCard, CommunityCardSkeleton, communityImage } from "@/components/communities/CommunityCard";
import { Eyebrow } from "@/components/ui/Badge";
import { getCommunityImages } from "@/lib/api/home";
import { getBulkCatalogStats } from "@/lib/api/market";
import { COMMUNITY_CITIES } from "@/lib/constants/cities";

export const metadata: Metadata = {
  title: "Communities",
  description:
    "Explore GTA communities with active inventory, asking prices and recent sold activity.",
  alternates: { canonical: "/communities" },
};

export const revalidate = 1800;


export default function CommunitiesPage() {
  return (
    <>
      <header className="border-b border-line bg-surface-alt py-8 sm:py-12">
        <div className="container-page">
          <Eyebrow>Where to live</Eyebrow>
          <h1 className="mt-3 text-h1 text-ink">GTA communities</h1>
          <p className="mt-2 max-w-2xl text-small text-ink-muted">
            Active inventory, asking prices and the last 90 days of sales, by city.
          </p>
        </div>
      </header>

      <div className="container-page py-10">
        <Suspense fallback={<CommunitiesSkeleton />}>
          <CommunityGrid />
        </Suspense>
      </div>
    </>
  );
}

/**
 * All city stats in ONE request (`catalog-stats/bulk/`, API_GAPS G4), with the
 * 90-day sold summary the backend attaches from AMPRE. If the request fails
 * the cards still render with dashes rather than the grid disappearing.
 */
async function CommunityGrid() {
  const [rows, curatedImages] = await Promise.all([
    getBulkCatalogStats({ cities: [...COMMUNITY_CITIES] }).catch(() => []),
    getCommunityImages(),
  ]);
  const byCity = new Map(rows.map((row) => [row.city.toLowerCase(), row]));

  return (
    <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {COMMUNITY_CITIES.map((city) => (
        <li key={city}>
          <CommunityCard
            city={city}
            image={communityImage(city, curatedImages)}
            stats={byCity.get(city.toLowerCase()) ?? null}
          />
        </li>
      ))}
    </ul>
  );
}

function CommunitiesSkeleton() {
  return (
    <div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      role="status"
      aria-label="Loading communities"
    >
      {Array.from({ length: 8 }).map((_, index) => (
        <CommunityCardSkeleton key={index} />
      ))}
    </div>
  );
}
