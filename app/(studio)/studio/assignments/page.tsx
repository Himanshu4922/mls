import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
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
import { cn } from "@/lib/utils/cn";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-ink">Assignment review</h1>
        <p className="mt-1 max-w-2xl text-small text-ink-muted">
          Check submitted listings, link assignments to their pre-con project, and approve, reject or request
          changes. The submitter is emailed each decision.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Review queues" className="flex flex-wrap gap-1.5">
          {REVIEW_QUEUES.map((entry) => (
            <Link
              key={entry.key}
              href={queueHref({ queue: entry.key, purpose, q })}
              aria-current={queue === entry.key ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-caption font-medium transition-colors",
                queue === entry.key
                  ? "border-navy bg-navy text-white"
                  : "border-line bg-surface text-ink-muted hover:border-navy hover:text-ink",
              )}
            >
              {entry.label}
              {counts ? ` (${counts[entry.key]})` : ""}
            </Link>
          ))}
        </nav>
        <nav aria-label="Listing type" className="flex gap-1.5">
          {PURPOSES.map((option) => (
            <Link
              key={option.label}
              href={queueHref({ queue, purpose: option.value, q })}
              aria-current={purpose === option.value ? "page" : undefined}
              className={cn(
                "rounded-control px-2.5 py-1 text-caption font-medium",
                purpose === option.value ? "bg-surface-alt text-ink" : "text-ink-muted hover:text-ink",
              )}
            >
              {option.label}
            </Link>
          ))}
        </nav>
        <form action="/studio/assignments" className="ml-auto flex w-full gap-2 sm:w-auto">
          {queue !== "open" && <input type="hidden" name="queue" value={queue} />}
          <input type="hidden" name="purpose" value={purpose || "all"} />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search address, project, name or email…"
            aria-label="Search submissions"
            className="h-10 w-full rounded-control border border-line bg-surface px-3 text-small text-ink focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy sm:w-72"
          />
          <button type="submit" className="rounded-control border border-line bg-surface px-3 text-small font-medium text-ink hover:border-navy">
            Search
          </button>
        </form>
      </div>

      {error ? (
        <p role="alert" className="rounded-surface border border-negative/30 bg-surface p-4 text-small text-ink">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-surface border border-line bg-surface p-8 text-center text-small text-ink-muted">
          {queue === "open" && !q ? "Nothing waiting for review." : "No submissions match that filter."}
        </p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-surface border border-line bg-surface">
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
    </div>
  );
}
