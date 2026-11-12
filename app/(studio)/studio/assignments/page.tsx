import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  StudioAlert,
  StudioEmpty,
  StudioFilterChip,
  StudioPage,
  StudioSegment,
  segmentItem,
  studioSearch,
  studioTable,
  studioTableWrap,
  studioTd,
  studioTh,
} from "@/components/studio/chrome";
import { SubmissionStatusPill } from "@/components/studio/StudioPills";
import { StudioRowMenu } from "@/components/studio/StudioRowMenu";
import { Pagination } from "@/components/ui/Pagination";
import {
  listReviewQueue,
  REVIEW_QUEUES,
  type QueueCounts,
  type ReviewQueue,
  type ReviewSubmissionSummary,
} from "@/lib/api/studioAdmin";
import { requireStudioAccess } from "@/lib/auth/session";
import { cn } from "@/lib/utils/cn";
import { formatPrice, formatRelativeTime } from "@/lib/utils/format";

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

  const queueLabel = REVIEW_QUEUES.find((entry) => entry.key === queue)?.label ?? queue;
  const purposeLabel = PURPOSES.find((option) => option.value === purpose)?.label ?? "Assignments";

  return (
    <StudioPage
      title="Review queue"
      description="Approve, reject, or request changes. Submitters are emailed each decision."
      filters={
        <>
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
          {queue !== "open" ? <StudioFilterChip label="Queue" value={queueLabel} /> : null}
          {purpose !== "assignment" ? <StudioFilterChip label="Type" value={purposeLabel} /> : null}
          {q ? (
            <Link href={queueHref({ queue, purpose })}>
              <StudioFilterChip label="Search" value={q} />
            </Link>
          ) : null}
          <form action="/studio/assignments" className="ml-auto flex items-center gap-2">
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
            <button
              type="submit"
              className="h-8 rounded-full border border-line bg-surface px-3 text-caption font-medium text-ink hover:border-navy"
            >
              Search
            </button>
          </form>
        </>
      }
    >
      {error ? (
        <StudioAlert>{error}</StudioAlert>
      ) : items.length === 0 ? (
        <StudioEmpty title={queue === "open" && !q ? "Nothing waiting" : "No submissions match"}>
          {queue === "open" && !q ? "New listings will land in To review." : "Try another queue or clear the search."}
        </StudioEmpty>
      ) : (
        <>
          <div className={studioTableWrap}>
            <table className={cn(studioTable, "min-w-[52rem]")}>
              <thead>
                <tr>
                  <th scope="col" className={studioTh}>
                    Listing
                  </th>
                  <th scope="col" className={studioTh}>
                    Status
                  </th>
                  <th scope="col" className={studioTh}>
                    Price
                  </th>
                  <th scope="col" className={studioTh}>
                    Submitted by
                  </th>
                  <th scope="col" className={studioTh}>
                    Project link
                  </th>
                  <th scope="col" className={studioTh}>
                    Submitted
                  </th>
                  <th scope="col" className={studioTh}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id}>
                    <td className={studioTd}>
                      <div className="flex items-center gap-2.5">
                        {item.coverUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.coverUrl}
                            alt=""
                            className="h-8 w-11 shrink-0 rounded-md object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="h-8 w-11 shrink-0 rounded-md bg-surface-alt" aria-hidden="true" />
                        )}
                        <div className="min-w-0">
                          <Link href={`/studio/assignments/${item.id}`} className="studio-cell-title hover:text-navy">
                            {item.title}
                          </Link>
                          <p className="studio-cell-meta">
                            #{item.id} · {item.purposeLabel} · {item.address}, {item.city}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={studioTd}>
                      <SubmissionStatusPill status={item.status} label={item.statusLabel} />
                    </td>
                    <td className={cn(studioTd, "text-ink-muted")}>
                      {item.askingPrice ? formatPrice(item.askingPrice) : "—"}
                    </td>
                    <td className={cn(studioTd, "text-ink-muted")}>
                      <span className="studio-cell-title">{item.contactName || "—"}</span>
                      <span className="studio-cell-meta">{item.submitterTypeLabel}</span>
                    </td>
                    <td className={cn(studioTd, "text-ink-muted")}>
                      {item.purpose !== "assignment" ? (
                        "—"
                      ) : item.preconTitle ? (
                        item.preconTitle
                      ) : (
                        <span className="text-gold-deep">Not linked</span>
                      )}
                    </td>
                    <td className={cn(studioTd, "whitespace-nowrap text-ink-muted")}>
                      {formatRelativeTime(item.submittedAt)}
                    </td>
                    <td className={studioTd}>
                      <StudioRowMenu
                        label={`Actions for ${item.title}`}
                        actions={[{ type: "link", label: "Review", href: `/studio/assignments/${item.id}` }]}
                      />
                    </td>
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
