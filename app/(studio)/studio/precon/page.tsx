import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PreconBulkUpload } from "@/components/studio/PreconBulkUpload";
import { PreconStatusPill } from "@/components/studio/StudioPills";
import { Pagination } from "@/components/ui/Pagination";
import { salesStageLabel } from "@/lib/api/preconstruction";
import { listStudioPrecon, PRECON_STATUSES, type StudioPreconSummary } from "@/lib/api/studioAdmin";
import { requireStudioAccess } from "@/lib/auth/session";
import { preconPath } from "@/lib/seo/urls";
import { cn } from "@/lib/utils/cn";
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink">Pre-con projects</h1>
          <p className="mt-1 text-small text-ink-muted">
            Create and edit pre-construction projects, their photos, documents and sales stage.
          </p>
        </div>
        <Link
          href="/studio/precon/new"
          className="rounded-control bg-navy px-4 py-2 text-small font-medium text-white transition-opacity hover:opacity-90"
        >
          New project
        </Link>
      </div>

      <PreconBulkUpload />

      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Filter by status" className="flex flex-wrap gap-1.5">
          {[{ value: "", label: "All" }, ...PRECON_STATUSES].map((option) => (
            <Link
              key={option.value || "all"}
              href={listHref({ q, status: option.value })}
              aria-current={status === option.value ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1.5 text-caption font-medium transition-colors",
                status === option.value
                  ? "border-navy bg-navy text-white"
                  : "border-line bg-surface text-ink-muted hover:border-navy hover:text-ink",
              )}
            >
              {option.label}
            </Link>
          ))}
        </nav>
        {/* A plain GET form: search works before hydration and stays in the URL. */}
        <form action="/studio/precon" className="ml-auto flex w-full gap-2 sm:w-auto">
          {status && <input type="hidden" name="status" value={status} />}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search name, address, developer or ID…"
            aria-label="Search projects"
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
      ) : projects.length === 0 ? (
        <p className="rounded-surface border border-line bg-surface p-8 text-center text-small text-ink-muted">
          {q || status ? "No projects match that filter." : "No projects yet. Create one or import a spreadsheet."}
        </p>
      ) : (
        <>
          <p className="text-caption text-ink-muted">
            {count.toLocaleString("en-CA")} {count === 1 ? "project" : "projects"}
          </p>
          <div className="overflow-x-auto rounded-surface border border-line bg-surface">
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
    </div>
  );
}
