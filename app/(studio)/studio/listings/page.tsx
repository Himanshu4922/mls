import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  StudioAlert,
  StudioEmpty,
  StudioPage,
  studioFilter,
  studioSearch,
  studioTable,
  studioTableWrap,
  studioTd,
  studioTh,
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
import { cn } from "@/lib/utils/cn";
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
      title="Brokerage listings"
      description="Exclusive inventory outside the MLS® feed."
      toolbar={
        <>
          <form action="/studio/listings" className="flex flex-wrap items-center gap-2">
            <select
              name="status"
              defaultValue={status}
              aria-label="Filter by visibility"
              className={studioFilter}
            >
              <option value="">All statuses</option>
              {LISTING_PUBLISH_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
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
              className="h-9 rounded-control border border-line bg-surface px-3 text-caption font-medium text-ink hover:border-navy"
            >
              Search
            </button>
          </form>
          <LinkButton href="/studio/listings/new" size="sm">
            + New listing
          </LinkButton>
        </>
      }
    >
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
            <table className={cn(studioTable, "min-w-[720px]")}>
              <thead>
                <tr>
                  <th scope="col" className={studioTh}>
                    Listing
                  </th>
                  <th scope="col" className={studioTh}>
                    Price
                  </th>
                  <th scope="col" className={studioTh}>
                    Status
                  </th>
                  <th scope="col" className={studioTh}>
                    Visibility
                  </th>
                  <th scope="col" className={studioTh}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {listings.map((row) => (
                  <tr key={row.id}>
                    <td className={studioTd}>
                      <div className="flex gap-3">
                        <div className="h-10 w-14 shrink-0 overflow-hidden rounded-md bg-surface-alt">
                          {row.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.image} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <Link href={`/studio/listings/${row.id}`} className="studio-cell-title hover:text-navy">
                            {row.title}
                          </Link>
                          <p className="studio-cell-meta">
                            {[row.address, row.city].filter(Boolean).join(", ") || row.listingKey}
                            {row.propertyType ? ` · ${row.propertyType}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={cn(studioTd, "whitespace-nowrap text-ink")}>
                      {row.listPrice !== null ? formatPrice(row.listPrice) : "—"}
                    </td>
                    <td className={cn(studioTd, "text-ink-muted")}>{row.standardStatus || "—"}</td>
                    <td className={studioTd}>
                      <ListingStatusPill status={row.publishStatus} />
                      {row.isFeatured ? (
                        <span className="mt-0.5 block text-caption text-navy">Featured</span>
                      ) : null}
                    </td>
                    <td className={studioTd}>
                      <div className="flex flex-wrap justify-end gap-3 text-caption">
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
