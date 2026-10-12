import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StudioAlert, StudioEmpty, StudioPage, StudioSegment, segmentItem, studioSearch, studioTableWrap } from "@/components/studio/chrome";
import { PreconBulkUpload } from "@/components/studio/PreconBulkUpload";
import { PreconStatusPill } from "@/components/studio/StudioPills";
import { LinkButton } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import { salesStageLabel } from "@/lib/api/preconstruction";
import { listStudioPrecon, PRECON_STATUSES, type StudioPreconSummary } from "@/lib/api/studioAdmin";
import { requireStudioAccess } from "@/lib/auth/session";
import { preconPath } from "@/lib/seo/urls";
import { formatDate, formatPrice } from "@/lib/utils/format";

export const metadata: Metadata = { title: "Pre-con projects" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

function listHref(next: { q?: string; status?: string; page?: number }) {
  const query = new URLSearchParams();
  if (next.q) query.set("q", next.q);
  if (next.status) query.set("status", next.status);
  if (next.page && next.page > 1) query.set("page", String(next.page));
  const qs = query.toString();
  return qs ? `/studio/precon?${qs}` : "/studio/precon";
}

/** Staff list of every pre-con project, any status (scope #2d). */
export default async function StudioPreconPage({ searchParams }: PageProps<"/studio/precon">) {
  const session = await requireStudioAccess();
  if (!session || !session.user.isStaff) notFound();

  const params = await searchParams;
  const q = first(params.q)?.trim().slice(0, 120) ?? "";
  const status = PRECON_STATUSES.find((s) => s.value === first(params.status))?.value ?? "";
  const page = Math.max(1, Number(first(params.page)) || 1);

  let projects: StudioPreconSummary[] = [];
  let count = 0;
  let error: string | null = null;
  try {
    const result = await listStudioPrecon(session.token, { q, status, page, pageSize: PAGE_SIZE });
    projects = result.items;
    count = result.count;
  } catch {
    error = "We couldn't load the projects. Refresh to try again.";
  }
  const totalPages = Math.max(1, Math.ceil(count / PAGE_SIZE));

  return (
    <StudioPage
      kicker="Listings"
      title="Pre-construction"
      description="Create and edit projects, their photos, documents, and sales stage. Import a spreadsheet when you have a batch."
      actions={
        <LinkButton href="/studio/precon/new" size="sm">
          New project
        </LinkButton>
      }
    >
      <PreconBulkUpload />

      <div className="flex flex-wrap items-center gap-3">
        <StudioSegment label="Filter by status">
          {[{ value: "", label: "All" }, ...PRECON_STATUSES].map((option) => (
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
        {/* A plain GET form: search works before hydration and stays in the URL. */}
        <form action="/studio/precon" className="ml-auto flex w-full gap-2 sm:w-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Name, address, developer, or ID"
            aria-label="Search projects"
            className={studioSearch}
          />
          <button type="submit" className="h-10 rounded-control border border-line bg-surface px-3 text-small font-medium text-ink shadow-card hover:border-navy">
            Search
          </button>
        </form>
      </div>

      {error ? (
        <StudioAlert>{error}</StudioAlert>
      ) : projects.length === 0 ? (
        <StudioEmpty title={q || status ? "No projects match" : "No projects yet"}>
          {q || status ? "Try another status or clear the search." : "Create one, or import a spreadsheet."}
        </StudioEmpty>
      ) : (
        <>
          <p className="text-caption text-ink-muted">
            {count.toLocaleString("en-CA")} {count === 1 ? "project" : "projects"}
          </p>
          <div className={studioTableWrap}>
            <table className="w-full min-w-[52rem] border-collapse text-small">
              <thead>
                <tr className="border-b border-line text-left text-caption text-ink-muted">
                  <th scope="col" className="px-4 py-3 font-medium">Project</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                  <th scope="col" className="px-4 py-3 font-medium">Sales stage</th>
                  <th scope="col" className="px-4 py-3 font-medium">Price</th>
                  <th scope="col" className="px-4 py-3 font-medium">Assignments</th>
                  <th scope="col" className="px-4 py-3 font-medium">Published</th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id} className="border-b border-line/60 last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {project.image ? (
                          // Studio thumbnails: plain img, no optimizer config needed for CMS hosts.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={project.image} alt="" className="h-10 w-14 shrink-0 rounded-control object-cover" loading="lazy" />
                        ) : (
                          <span className="h-10 w-14 shrink-0 rounded-control bg-surface-alt" aria-hidden="true" />
                        )}
                        <div className="min-w-0">
                          <Link href={`/studio/precon/${project.id}`} className="font-medium text-ink hover:text-navy">
                            {project.title}
                          </Link>
                          <p className="mt-0.5 truncate text-caption text-ink-subtle">
                            #{project.id}
                            {project.developer ? ` · ${project.developer}` : ""}
                            {project.isFeatured ? ` · Featured${project.featuredOrder ? ` #${project.featuredOrder}` : ""}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <PreconStatusPill status={project.status} />
                    </td>
                    <td className="px-4 py-3 text-ink-muted">{salesStageLabel(project.salesStage) ?? "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{project.price ? formatPrice(project.price) : "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{project.assignmentCount || "—"}</td>
                    <td className="px-4 py-3 text-ink-muted">{project.publishedAt ? formatDate(project.publishedAt) : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3 text-caption">
                        <Link href={`/studio/precon/${project.id}`} className="text-ink-muted hover:text-navy">
                          Edit
                        </Link>
                        {project.status === "publish" && (
                          <Link href={preconPath(project.id, project.slug || project.title)} className="text-ink-muted hover:text-navy">
                            View
                          </Link>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} buildHref={(next) => listHref({ q, status, page: next })} />
        </>
      )}
    </StudioPage>
  );
}
