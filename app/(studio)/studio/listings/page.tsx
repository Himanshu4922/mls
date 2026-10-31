import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  StudioAlert,
  StudioEmpty,
  StudioPage,
  StudioSegment,
  segmentItem,
  studioSearch,
  studioTableWrap,
} from "@/components/studio/chrome";
import { ListingStatusPill } from "@/components/studio/StudioPills";
import { LinkButton } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import {
  LISTING_PUBLISH_STATUSES,
  listStudioListings,
  type StudioListingSummary,
} from "@/lib/api/estateListings";
import { requireStudioAccess } from "@/lib/auth/session";
import { estateListingPath } from "@/lib/seo/urls";
import { formatPrice } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Brokerage listings" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function listHref(next: { q?: string; status?: string; page?: number }) {
  const query = new URLSearchParams();
  if (next.q) query.set("q", next.q);
  if (next.status) query.set("status", next.status);
  if (next.page && next.page > 1) query.set("page", String(next.page));
  const qs = query.toString();
  return qs ? `/studio/listings?${qs}` : "/studio/listings";
}

/** Staff list of brokerage-managed homes (not MLS® feed). */
export default async function StudioListingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await requireStudioAccess();
  if (!session || !session.user.isStaff) notFound();

  const params = await searchParams;
  const q = first(params.q)?.trim().slice(0, 120) ?? "";
  const status = LISTING_PUBLISH_STATUSES.find((s) => s.value === first(params.status))?.value ?? "";
  const page = Math.max(1, Number(first(params.page)) || 1);

  let listings: StudioListingSummary[] = [];
  let count = 0;
  let error: string | null = null;
  try {
    const result = await listStudioListings(session.token, {
      search: q,
      publishStatus: status,
      page,
      pageSize: PAGE_SIZE,
    });
    listings = result.items;
    count = result.count;
  } catch {
    error = "We couldn't load the listings. Refresh to try again.";
  }
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <StudioPage
      kicker="Listings"
      title="Brokerage listings"
      description="Add and edit homes your team lists yourself — exclusive inventory outside the MLS® feed. Pre-construction projects stay under Pre-construction."
      actions={
        <LinkButton href="/studio/listings/new" size="sm">
          New listing
        </LinkButton>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <StudioSegment label="Filter by visibility">
          {[{ value: "", label: "All" }, ...LISTING_PUBLISH_STATUSES].map((option) => (
            <Link
              key={option.value || "all"}
              href={listHref({ q, status: option.value })}
              aria-current={status === option.value ? "page" : undefined}
              className={segmentItem(status === option.value)}
            >
              {option.label}
            </Link>
          ))}
        </StudioSegment>
        <form action="/studio/listings" className="ml-auto flex w-full gap-2 sm:w-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Address, title, city, or key"
            aria-label="Search listings"
            className={studioSearch}
          />
          <button
            type="submit"
            className="h-10 rounded-control border border-line bg-surface px-3 text-small font-medium text-ink shadow-card hover:border-navy"
          >
            Search
          </button>
        </form>
      </div>

      {error ? (
        <StudioAlert>{error}</StudioAlert>
      ) : listings.length === 0 ? (
        <StudioEmpty
          title={q || status ? "No listings match" : "No brokerage listings yet"}
          action={
            !q && !status ? (
              <LinkButton href="/studio/listings/new" size="sm">
                Add your first listing
              </LinkButton>
            ) : undefined
          }
        >
          {q || status
            ? "Try another visibility filter or clear the search."
            : "Create a listing with address, price, photos, and publish when it’s ready."}
        </StudioEmpty>
      ) : (
        <>
          <div className={studioTableWrap}>
            <table className="w-full min-w-[720px] text-left text-small">
              <thead className="border-b border-line bg-surface-alt text-caption font-medium text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Listing
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Price
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Visibility
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {listings.map((row) => (
                  <tr key={row.id} className="align-top">
                    <td className="px-4 py-3">
                      <div className="flex gap-3">
                        <div className="h-14 w-20 shrink-0 overflow-hidden rounded-control bg-surface-alt">
                          {row.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.image} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/studio/listings/${row.id}`} className="font-medium text-ink hover:text-navy">
                            {row.title}
                          </Link>
                          <p className="mt-0.5 text-caption text-ink-muted">
                            {[row.address, row.city].filter(Boolean).join(", ") || row.listingKey}
                          </p>
                          {row.propertyType ? (
                            <p className="mt-0.5 text-caption text-ink-subtle">{row.propertyType}</p>
                          ) : null}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-ink">
                      {row.listPrice !== null ? formatPrice(row.listPrice) : "—"}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{row.standardStatus || "—"}</td>
                    <td className="px-4 py-3">
                      <ListingStatusPill status={row.publishStatus} />
                      {row.isFeatured ? (
                        <span className="mt-1 block text-caption text-navy">Featured</span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap justify-end gap-3">
                        <Link href={`/studio/listings/${row.id}`} className="text-ink-muted hover:text-navy">
                          Edit
                        </Link>
                        {row.publishStatus === "publish" ? (
                          <Link
                            href={estateListingPath(row.id)}
                            className="text-ink-muted hover:text-navy"
                            target="_blank"
                          >
                            View
                          </Link>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 ? (
            <Pagination
              page={page}
              totalPages={totalPages}
              buildHref={(nextPage) => listHref({ q, status, page: nextPage })}
            />
          ) : null}
        </>
      )}
    </StudioPage>
  );
}
