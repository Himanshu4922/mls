import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioAlert, StudioPage, StudioPanel } from "@/components/studio/chrome";
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

  const windowLabel = `${days} days`;

  return (
    <StudioPage
      kicker="Workspace"
      title="Activity"
      description={`Listing views, pre-construction clicks, searches, and leads from the last ${windowLabel}.`}
      actions={
        <form className="flex flex-wrap items-end gap-2" action="/studio/activity">
          <label className="text-caption text-ink-muted">
            Window
            <select
              name="days"
              defaultValue={String(days)}
              className="mt-1 block h-10 rounded-control border border-line bg-surface px-3 text-small text-ink shadow-card"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </label>
          <label className="text-caption text-ink-muted">
            Person
            <input
              name="user"
              defaultValue={userId}
              inputMode="numeric"
              placeholder="Everyone"
              aria-label="User id"
              className="mt-1 block h-10 w-32 rounded-control border border-line bg-surface px-3 text-small text-ink shadow-card"
            />
          </label>
          <button type="submit" className="h-10 rounded-control bg-navy px-4 text-small font-medium text-white hover:bg-navy-deep">
            Update
          </button>
        </form>
      }
    >
      {error || !report ? (
        <StudioAlert>{error}</StudioAlert>
      ) : (
        <>
          <section className="grid gap-px overflow-hidden rounded-surface border border-line bg-line shadow-card sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Inquiries" value={report.leads.inquiries} />
            <Stat label="Assignment submissions" value={report.leads.assignmentSubmissions} />
            <Stat label="Newsletter sign-ups" value={report.leads.newsletter} />
            <Stat label="Neighbour alerts" value={report.leads.neighbourAlerts} />
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
            <StudioPanel title="Top listings" description="Homes people opened most.">
              {report.topListings.length === 0 ? (
                <Empty />
              ) : (
                <ul className="divide-y divide-line">
                  {report.topListings.map((row) => (
                    <li key={row.listingKey} className="flex items-center justify-between gap-3 py-2.5 text-small">
                      <span className="min-w-0 truncate text-ink">
                        {row.address || row.listingKey}
                        {row.city ? <span className="text-ink-muted"> · {row.city}</span> : null}
                      </span>
                      <span className="shrink-0 tabular-nums text-ink-muted">{row.views}</span>
                    </li>
                  ))}
                </ul>
              )}
            </StudioPanel>
            <StudioPanel title="Top projects" description="Pre-construction pages, and what people opened on them.">
              {report.topProjects.length === 0 ? (
                <Empty />
              ) : (
                <ul className="divide-y divide-line">
                  {report.topProjects.map((row) => (
                    <li key={row.id} className="py-2.5 text-small">
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 truncate text-ink">{row.title}</span>
                        <span className="shrink-0 tabular-nums text-ink-muted">{row.views}</span>
                      </div>
                      <p className="mt-0.5 text-caption text-ink-muted">
                        Floor plans {row.floorPlans} · Pricing {row.pricing} · Contact {row.contact}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </StudioPanel>
          </section>

          <StudioPanel
            title="Searches"
            description={`${report.searches.count.toLocaleString("en-CA")} searches, including ${report.searches.aiCount.toLocaleString("en-CA")} through the assistant.`}
          >
            {report.searches.topQueries.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y divide-line">
                {report.searches.topQueries.map((row) => (
                  <li key={row.query} className="flex justify-between gap-3 py-2.5 text-small">
                    <span className="text-ink">{row.query}</span>
                    <span className="tabular-nums text-ink-muted">{row.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </StudioPanel>

          <StudioPanel title={report.userId ? `Timeline for user ${report.userId}` : "Recent timeline"}>
            {report.timeline.length === 0 ? (
              <Empty />
            ) : (
              <ul className="divide-y divide-line">
                {report.timeline.map((row, index) => (
                  <li key={`${row.at}-${index}`} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-small">
                    <span className="text-ink">
                      <span className="font-medium text-navy">{KIND_LABELS[row.kind] ?? row.kind}</span>
                      <span className="text-ink-muted"> · {row.label}</span>
                    </span>
                    <span className="text-caption text-ink-muted">
                      {row.userEmail || "Guest"} · {row.at.slice(0, 16).replace("T", " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </StudioPanel>
        </>
      )}
    </StudioPage>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-surface px-5 py-4">
      <p className="text-caption text-ink-muted">{label}</p>
      <p className="mt-1 text-h2 tabular-nums text-ink">{value.toLocaleString("en-CA")}</p>
    </div>
  );
}

function Empty() {
  return <p className="py-3 text-small text-ink-muted">Nothing recorded in this window yet.</p>;
}
