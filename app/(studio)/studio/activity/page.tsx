import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getStudioActivity, type StudioActivity } from "@/lib/api/studioActivity";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Activity" };
export const dynamic = "force-dynamic";

const KIND_LABELS: Record<string, string> = {
  listing_view: "Listing view",
  precon_view: "Pre-con view",
  precon_floor_plans: "Floor plans",
  precon_pricing: "Pricing",
  precon_contact: "Contact",
  search: "Search",
  ai_assist: "Assistant",
  inquiry: "Inquiry",
};

export default async function StudioActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string; days?: string }>;
}) {
  const session = await requireStudioAccess();
  if (!session || !session.user.isStaff) notFound();

  const params = await searchParams;
  const userId = (params.user || "").replace(/\D/g, "").slice(0, 12);
  const days = params.days === "7" || params.days === "90" ? Number(params.days) : 30;

  let report: StudioActivity | null = null;
  let error: string | null = null;
  try {
    report = await getStudioActivity(session.token, { days, userId: userId || undefined });
  } catch {
    error = "We couldn't load activity. Refresh to try again.";
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-ink">Activity</h1>
        <p className="mt-1 text-small text-ink-muted">
          Listing views, pre-construction clicks, searches and leads from the last {days} days.
        </p>
      </div>

      <form className="flex flex-wrap items-end gap-3" action="/studio/activity">
        <label className="text-caption text-ink-muted">
          Days
          <select
            name="days"
            defaultValue={String(days)}
            className="mt-1 block rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
          >
            <option value="7">7</option>
            <option value="30">30</option>
            <option value="90">90</option>
          </select>
        </label>
        <label className="text-caption text-ink-muted">
          User id
          <input
            name="user"
            defaultValue={userId}
            inputMode="numeric"
            placeholder="Everyone"
            className="mt-1 block w-36 rounded-control border border-line bg-surface px-3 py-2 text-small text-ink"
          />
        </label>
        <button
          type="submit"
          className="rounded-control bg-navy px-4 py-2 text-small font-medium text-white hover:bg-navy-deep"
        >
          Update
        </button>
      </form>

      {error || !report ? (
        <p role="alert" className="rounded-surface border border-negative/30 bg-surface p-4 text-small text-ink">
          {error}
        </p>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Inquiries" value={report.leads.inquiries} />
            <Stat label="Assignment submissions" value={report.leads.assignmentSubmissions} />
            <Stat label="Newsletter sign-ups" value={report.leads.newsletter} />
            <Stat label="Neighbour alerts" value={report.leads.neighbourAlerts} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <Panel title="Top listings">
              {report.topListings.length === 0 ? (
                <Empty />
              ) : (
                <ul className="divide-y divide-line-soft">
                  {report.topListings.map((row) => (
                    <li key={row.listingKey} className="flex items-center justify-between gap-3 py-2 text-small">
                      <span className="min-w-0 truncate text-ink">
                        {row.address || row.listingKey}
                        {row.city ? <span className="text-ink-muted"> · {row.city}</span> : null}
                      </span>
                      <span className="shrink-0 text-ink-muted">{row.views} views</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
            <Panel title="Top pre-construction projects">
              {report.topProjects.length === 0 ? (
                <Empty />
              ) : (
                <ul className="divide-y divide-line-soft">
                  {report.topProjects.map((row) => (
                    <li key={row.id} className="py-2 text-small">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-ink">{row.title}</span>
                        <span className="shrink-0 text-ink-muted">{row.views} views</span>
                      </div>
                      <p className="text-caption text-ink-muted">
                        Floor plans {row.floorPlans} · Pricing {row.pricing} · Contact {row.contact}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </section>

          <Panel title={`Searches (${report.searches.count}, including ${report.searches.aiCount} AI)`}>
            {report.searches.topQueries.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y divide-line-soft">
                {report.searches.topQueries.map((row) => (
                  <li key={row.query} className="flex justify-between gap-3 py-2 text-small">
                    <span className="text-ink">{row.query}</span>
                    <span className="text-ink-muted">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title={report.userId ? `Timeline for user ${report.userId}` : "Recent timeline"}>
            {report.timeline.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y divide-line-soft">
                {report.timeline.map((row, index) => (
                  <li key={`${row.at}-${index}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2 text-small">
                    <span className="text-ink">
                      <span className="text-ink-muted">{KIND_LABELS[row.kind] ?? row.kind}</span>
                      {" · "}
                      {row.label}
                    </span>
                    <span className="text-caption text-ink-muted">
                      {row.userEmail || "Guest"} · {row.at.slice(0, 16).replace("T", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-surface border border-line bg-surface p-4">
      <p className="text-caption text-ink-muted">{label}</p>
      <p className="mt-1 text-h2 text-ink">{value.toLocaleString("en-CA")}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-surface border border-line bg-surface p-4">
      <h2 className="text-h3 text-ink">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Empty() {
  return <p className="py-3 text-small text-ink-muted">Nothing recorded in this window yet.</p>;
}
