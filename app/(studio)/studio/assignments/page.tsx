import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioAlert, StudioEmpty, StudioPage, StudioSegment, segmentItem, studioSearch, studioTableWrap } from "@/components/studio/chrome";
import { SubmissionStatusPill } from "@/components/studio/StudioPills";
import { Pagination } from "@/components/ui/Pagination";
import {
  listReviewQueue,
  REVIEW_QUEUES,
  type QueueCounts,
  type ReviewQueue,
  type ReviewSubmissionSummary,
} from "@/lib/api/studioAdmin";
import { requireStudioAccess } from "@/lib/auth/session";
import { formatDate, formatPrice } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Assignment review" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const PURPOSES = [
  { value: "assignment", label: "Assignments" },
  { value: "", label: "All listings" },
] as const;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function queueHref(next: { queue: ReviewQueue; purpose: string; q?: string; page?: number }) {
  const query = new URLSearchParams();
  if (next.queue !== "open") query.set("queue", next.queue);
  // Assignments is the default view; "all" must be explicit to survive.
  query.set("purpose", next.purpose || "all");
  if (next.q) query.set("q", next.q);
  if (next.page && next.page > 1) query.set("page", String(next.page));
  return `/studio/assignments?${query}`;
}

/**
 * Review queue for owner/agent submissions (scope #2d). Assignments are the
 * default, but sale/rent submissions share the same workflow and can be shown.
 */
export default async function StudioAssignmentsPage({ searchParams }: PageProps<"/studio/assignments">) {
  const session = await requireStudioAccess();
  if (!session || !session.user.isStaff) notFound();

  const params = await searchParams;
  const queue = REVIEW_QUEUES.find((entry) => entry.key === first(params.queue))?.key ?? "open";
  const rawPurpose = first(params.purpose);
  const purpose = rawPurpose === "all" ? "" : "assignment";
  const q = first(params.q)?.trim().slice(0, 120) ?? "";
  const page = Math.max(1, Number(first(params.page)) || 1);

  let items: ReviewSubmissionSummary[] = [];
  let counts: QueueCounts | null = null;
  let count = 0;
  let error: string | null = null;
  try {
    const result = await listReviewQueue(session.token, { queue, purpose, q, page });
    items = result.items;
    counts = result.counts;
    count = result.count;
  } catch {
    error = "We couldn't load the review queue. Refresh to try again.";
  }
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <StudioPage
      kicker="Listings"
      title="Review queue"
      description="Check submitted listings, link assignments to their project, then approve, reject, or request changes. The submitter is emailed each decision."
    >
      <div className="flex flex-wrap items-center gap-3">
        <StudioSegment label="Review queues">
          {REVIEW_QUEUES.map((entry) => (
            <Link
              key={entry.key}
              href={queueHref({ queue: entry.key, purpose, q })}
              aria-current={queue === entry.key ? "page" : undefined}
              className={segmentItem(queue === entry.key)}
            >
              {entry.label}
              {counts ? ` ${counts[entry.key]}` : ""}
            </Link>
          ))}
        </StudioSegment>
        <StudioSegment label="Listing type">
          {PURPOSES.map((option) => (
            <Link
              key={option.label}
              href={queueHref({ queue, purpose: option.value, q })}
              aria-current={purpose === option.value ? "page" : undefined}
              className={segmentItem(purpose === option.value)}
            >
              {option.label}
            </Link>
          ))}
        </StudioSegment>
        <form action="/studio/assignments" className="ml-auto flex w-full gap-2 sm:w-auto">
          {queue !== "open" && <input type="hidden" name="queue" value={queue} />}
          <input type="hidden" name="purpose" value={purpose || "all"} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Address, project, name, or email"
            aria-label="Search submissions"
            className={studioSearch}
          />
          <button type="submit" className="h-10 rounded-control border border-line bg-surface px-3 text-small font-medium text-ink shadow-card hover:border-navy">
            Search
          </button>
        </form>
      </div>

      {error ? (
        <StudioAlert>{error}</StudioAlert>
      ) : items.length === 0 ? (
        <StudioEmpty title={queue === "open" && !q ? "Nothing waiting" : "No submissions match"}>
          {queue === "open" && !q ? "New listings will land in To review." : "Try another queue or clear the search."}
        </StudioEmpty>
      ) : (
        <>
          <div className={studioTableWrap}>
            <table className="w-full min-w-[52rem] border-collapse text-small">
              <thead>
                <tr className="border-b border-line text-left text-caption text-ink-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Listing</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Price</th>
                  <th scope="col" className="px-4 py-3 font-medium">Submitted by</th>
                  <th scope="col" className="px-4 py-3 font-medium">Project link</th>
                  <th scope="col" className="px-4 py-3 font-medium">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {item.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.coverUrl} alt="" className="h-10 w-14 shrink-0 rounded-control object-cover" loading="lazy" />
                        ) : (
                          <span className="h-10 w-14 shrink-0 rounded-control bg-surface-alt" aria-hidden="true" />
                        )}
                        <div className="min-w-0">
                          <Link href={`/studio/assignments/${item.id}`} className="font-medium text-ink hover:text-navy">
                            {item.title}
                          </Link>
                          <p className="mt-0.5 truncate text-caption text-ink-subtle">
                            #{item.id} · {item.purposeLabel} · {item.address}, {item.city} · {item.photoCount} photo
                            {item.photoCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <SubmissionStatusPill status={item.status} label={item.statusLabel} />
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{item.askingPrice ? formatPrice(item.askingPrice) : "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">
                      <span className="block text-ink">{item.contactName || "—"}</span>
                      <span className="text-caption">{item.submitterTypeLabel}</span>
                    </td>
                    <td className="px-4 py-3 text-ink-muted">
                      {item.purpose !== "assignment" ? "—" : item.preconTitle ?? <span className="text-gold-deep">Not linked</span>}
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{item.submittedAt ? formatDate(item.submittedAt) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} buildHref={(next) => queueHref({ queue, purpose, q, page: next })} />
        </>
      )}
    </StudioPage>
  );
}
