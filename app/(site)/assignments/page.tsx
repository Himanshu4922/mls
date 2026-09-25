import type { Metadata } from "next";
import { Suspense } from "react";
import { AssignmentCard } from "@/components/assignments/AssignmentCard";
import { NavChip } from "@/components/navigation/NavChip";
import { PendingContent, PendingNavigationProvider } from "@/components/navigation/PendingNavigation";
import { Eyebrow } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { getPublicAssignments } from "@/lib/api/assignments";
import { COMMUNITY_CITIES } from "@/lib/constants/cities";

export const metadata: Metadata = {
  title: "Exclusive pre-construction assignments",
  description:
    "Buy a pre-construction condo or home before it closes. Assignment sales listed directly by owners, agents and builders across the GTA.",
  alternates: { canonical: "/assignments" },
};

export const revalidate = 300;

const PAGE_SIZE = 12;
const PRICE_OPTIONS = [
  { label: "Any price", max: undefined },
  { label: "Under $600K", max: 600_000 },
  { label: "Under $800K", max: 800_000 },
  { label: "Under $1M", max: 1_000_000 },
  { label: "Under $1.5M", max: 1_500_000 },
] as const;

type Params = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/**
 * Exclusive Assignments (scope #13, like Housing.com's owner listings):
 * approved assignment sales submitted through /sell/list. Filters live in the
 * URL so every view is shareable and crawlable.
 */
export default async function AssignmentsPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const city = COMMUNITY_CITIES.find((c) => c.toLowerCase() === first(params.city)?.toLowerCase());
  const priceMax = PRICE_OPTIONS.find((o) => String(o.max) === first(params.priceMax))?.max;
  const page = Math.max(1, Number(first(params.page)) || 1);

  const href = (next: { city?: string | null; priceMax?: number | null; page?: number }) => {
    const query = new URLSearchParams();
    const nextCity = next.city === undefined ? city : next.city;
    const nextPrice = next.priceMax === undefined ? priceMax : next.priceMax;
    if (nextCity) query.set("city", nextCity);
    if (nextPrice) query.set("priceMax", String(nextPrice));
    if (next.page && next.page > 1) query.set("page", String(next.page));
    const qs = query.toString();
    return qs ? `/assignments?${qs}` : "/assignments";
  };

  return (
    <PendingNavigationProvider>
      <header className="border-b border-line bg-surface-alt py-8 sm:py-12">
        <div className="container-page">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <Eyebrow>Exclusive listings</Eyebrow>
              <h1 className="mt-3 text-h1 text-ink">Pre-construction assignments</h1>
              <p className="mt-2 max-w-2xl text-small text-ink-muted">
                Take over a pre-construction purchase before it closes. Listed directly by owners, agents and builders,
                and reviewed by our team before they go live.
              </p>
            </div>
            <LinkButton href="/sell/list" variant="accent" size="md">
              List your assignment free
            </LinkButton>
          </div>

          <nav aria-label="Filter by city" className="mt-6 flex flex-wrap gap-2">
            <NavChip href={href({ city: null, page: 1 })} current={!city} scroll={false}>
              All cities
            </NavChip>
            {COMMUNITY_CITIES.map((option) => (
              <NavChip key={option} href={href({ city: option, page: 1 })} current={option === city} scroll={false}>
                {option}
              </NavChip>
            ))}
          </nav>
          <nav aria-label="Filter by price" className="mt-3 flex flex-wrap gap-2">
            {PRICE_OPTIONS.map((option) => (
              <NavChip
                key={option.label}
                href={href({ priceMax: option.max ?? null, page: 1 })}
                current={option.max === priceMax}
                scroll={false}
              >
                {option.label}
              </NavChip>
            ))}
          </nav>
        </div>
      </header>

      <div className="container-page py-10">
        <PendingContent fallback={<GridSkeleton />}>
          <Suspense key={`${city}-${priceMax}-${page}`} fallback={<GridSkeleton />}>
            <Results city={city} priceMax={priceMax} page={page} buildPageHref={(p) => href({ page: p })} />
          </Suspense>
        </PendingContent>
      </div>
    </PendingNavigationProvider>
  );
}

async function Results({
  city,
  priceMax,
  page,
  buildPageHref,
}: {
  city?: string;
  priceMax?: number;
  page: number;
  buildPageHref: (page: number) => string;
}) {
  let data;
  try {
    data = await getPublicAssignments({ city, priceMax, page, pageSize: PAGE_SIZE });
  } catch {
    return <ErrorState title="Assignments are unavailable" description="Please try again in a moment." />;
  }

  if (data.count === 0) {
    const filtered = Boolean(city || priceMax);
    return (
      <EmptyState
        title={filtered ? "No assignments match these filters" : "No assignments listed yet"}
        description={
          filtered
            ? "Try another city or price range."
            : "Be the first: list your pre-construction assignment free and reach buyers across the GTA."
        }
        action={filtered ? { label: "Clear filters", href: "/assignments" } : { label: "List your assignment", href: "/sell/list" }}
      />
    );
  }

  const totalPages = Math.max(1, Math.ceil(data.count / PAGE_SIZE));
  return (
    <>
      <p className="mb-4 text-small text-ink-muted">
        {data.count} {data.count === 1 ? "assignment" : "assignments"}
      </p>
      <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.results.map((listing) => (
          <li key={listing.id}>
            <AssignmentCard listing={listing} />
          </li>
        ))}
      </ul>
      {totalPages > 1 && (
        <div className="mt-8">
          <Pagination page={page} totalPages={totalPages} buildHref={buildPageHref} />
        </div>
      )}
    </>
  );
}

function GridSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading assignments">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-surface border border-line">
          <Skeleton className="h-[190px] rounded-none" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
