import Link from "next/link";
import { PropertyCard } from "@/components/property/PropertyCard";
import { EmptyState } from "@/components/ui/States";
import { safeFetch } from "@/lib/api/client";
import { getNewlyListed } from "@/lib/api/properties";
import type { PropertySummary } from "@/lib/types/domain";
import { cn } from "@/lib/utils/cn";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * "Today's New Listings" (HomeAtlasUI HomePage L439-481). LIVE from the
 * newly-listed endpoint: first with `since_hours=24` (strict — may be empty),
 * then, only if that returns nothing, the plain newest four.
 *
 * Honest labelling: the reference stamped "NEW TODAY" on every card and
 * claimed "Just added in the last 24 hours" unconditionally. Here the claim is
 * made only when it is true — a card gets the "New today" marker only if its
 * `listedAt` is within 24h, and the "last 24 hours" subtitle is used only when
 * at least one card qualifies. Otherwise the four newest are still shown under
 * a neutral subtitle. PropertyCard's own "New" badge (a multi-day window from
 * the mapper) is left as-is; the marker below it is the 24h-specific one.
 *
 * `revalidate` on the fetch is 600s, so "now" is at most ~10 minutes stale.
 */
export async function TodaysNewListings() {
  // Strict 24h window first; if nothing was listed today, fall back to the
  // plain four newest under the neutral subtitle.
  const today = await safeFetch<PropertySummary[]>(
    getNewlyListed(4, { params: { since_hours: 24 }, timeoutMs: 8_000 }),
    [],
    "home:todays-new:24h",
  );
  const listings =
    today.length > 0
      ? today
      : await safeFetch<PropertySummary[]>(
          getNewlyListed(4),
          [],
          "home:todays-new",
        );

  // eslint-disable-next-line react-hooks/purity -- server component; evaluated once per render/revalidation.
  const now = Date.now();
  const isToday = (p: PropertySummary) => {
    if (!p.listedAt) return false;
    const t = new Date(p.listedAt).getTime();
    return !Number.isNaN(t) && now - t >= 0 && now - t <= DAY_MS;
  };
  const anyToday = listings.some(isToday);
  const updated = new Date(now).toLocaleDateString("en-CA", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Toronto",
  });

  return (
    <section className="bg-surface py-10 sm:py-14 lg:py-16">
      <div className="container-page">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 sm:mb-8">
          <div>
            <p className="flex items-center gap-2 text-eyebrow uppercase text-gold">
              <span
                aria-hidden="true"
                className="h-2 w-2 animate-pulse rounded-full bg-gold"
              />
              Live
            </p>
            <h2 className="mt-2 text-h1 text-ink">
              Today&rsquo;s New Listings
            </h2>
            <p className="mt-2 text-small text-ink-muted">
              {anyToday
                ? "Just added in the last 24 hours"
                : "The newest listings on the market"}
              {" · "}Updated {updated}
            </p>
          </div>
          <Link
            href="/listings?sort=newest"
            className="text-small font-semibold text-navy transition-colors hover:text-gold"
          >
            View All →
          </Link>
        </div>

        {listings.length === 0 ? (
          <EmptyState
            title="Listings are unavailable right now"
            description="We couldn't reach the listing service. Please try again shortly."
            action={{ label: "Browse listings", href: "/listings" }}
          />
        ) : (
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {listings.slice(0, 4).map((property) => (
              <li key={property.id} className="relative h-full">
                <PropertyCard property={property} className="h-full" />
                {isToday(property) && (
                  <span
                    className={cn(
                      "pointer-events-none absolute left-3 z-10",
                      // Sit below PropertyCard's own badge pill when it has one.
                      property.badge ? "top-12" : "top-3",
                    )}
                  >
                    <span className="flex items-center gap-1 rounded-full bg-navy px-2 py-1 text-[10px] font-bold uppercase text-white">
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold"
                      />
                      New today
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
