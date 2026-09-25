import type { Metadata } from "next";
import { Suspense } from "react";
import { RecentSalesList } from "@/components/market/RecentSalesList";
import { NavChip } from "@/components/navigation/NavChip";
import { PendingNavigationProvider } from "@/components/navigation/PendingNavigation";
import { Eyebrow } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/States";
import { MARKET_CITIES, RECENT_SALES_DAYS } from "@/lib/api/market";

export const metadata: Metadata = {
  title: "Recently sold homes",
  description:
    "Homes that recently sold across the GTA: sold price, asking price, days on market and sale date, by city.",
  alternates: { canonical: "/recently-sold" },
};

/**
 * Recently Sold Listings (scope #7, HouseSigma footer link). The shell and
 * filters render on the server; the list itself is client-side and sign-in
 * gated (see RecentSalesList).
 */
export default async function RecentlySoldPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawCity = Array.isArray(params.city) ? params.city[0] : params.city;
  const city = MARKET_CITIES.find((c) => c.toLowerCase() === rawCity?.toLowerCase()) ?? MARKET_CITIES[0];
  const rawDays = Number(Array.isArray(params.days) ? params.days[0] : params.days);
  const days = (RECENT_SALES_DAYS as readonly number[]).includes(rawDays) ? rawDays : 30;
  const page = Math.max(1, Number(Array.isArray(params.page) ? params.page[0] : params.page) || 1);

  const href = (next: { city?: string; days?: number }) =>
    `/recently-sold?${new URLSearchParams({ city: next.city ?? city, days: String(next.days ?? days) })}`;

  return (
    <PendingNavigationProvider>
      <header className="border-b border-line bg-surface-alt py-8 sm:py-12">
        <div className="container-page">
          <Eyebrow>Sold data</Eyebrow>
          <h1 className="mt-3 text-h1 text-ink">Recently sold homes</h1>
          <p className="mt-2 max-w-2xl text-small text-ink-muted">
            What homes actually sold for, compared with their asking price.
          </p>

          <nav aria-label="Select a city" className="mt-6 flex flex-wrap gap-2">
            {MARKET_CITIES.map((option) => (
              <NavChip key={option} href={href({ city: option })} current={option === city} scroll={false}>
                {option}
              </NavChip>
            ))}
          </nav>
          <nav aria-label="Select a period" className="mt-3 flex flex-wrap gap-2">
            {RECENT_SALES_DAYS.map((option) => (
              <NavChip key={option} href={href({ days: option })} current={option === days} scroll={false}>
                Last {option} days
              </NavChip>
            ))}
          </nav>
        </div>
      </header>

      <div className="container-page py-10">
        {/* The list reads auth state, which only exists in the browser. */}
        <Suspense fallback={<Skeleton className="h-64 w-full" />}>
          <RecentSalesList city={city} days={days} page={page} />
        </Suspense>
      </div>
    </PendingNavigationProvider>
  );
}
