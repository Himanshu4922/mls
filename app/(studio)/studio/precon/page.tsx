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
import { PreconBulkUpload } from "@/components/studio/PreconBulkUpload";
import { PreconStatusPill } from "@/components/studio/StudioPills";
import { LinkButton } from "@/components/ui/Button";
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
    <StudioPage
      title="Pre-construction"
      description="Projects, photos, documents, and sales stage."
      toolbar={
        <>
          <form action="/studio/precon" className="flex flex-wrap items-center gap-2">
            <select name="status" defaultValue={status} aria-label="Filter by status" className={studioFilter}>
              <option value="">All statuses</option>
              {PRECON_STATUSES.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Name, address, developer, or ID"
              aria-label="Search projects"
              className={studioSearch}
            />
            <button
              type="submit"
              className="h-9 rounded-control border border-line bg-surface px-3 text-caption font-medium text-ink hover:border-navy"
            >
              Search
            </button>
          </form>
          <LinkButton href="/studio/precon/new" size="sm">
            + New project
          </LinkButton>
        </>
      }
    >
      <PreconBulkUpload />

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
            <table className={cn(studioTable, "min-w-[52rem]")}>
              <thead>
                <tr>
                  <th scope="col" className={studioTh}>
                    Project
                  </th>
                  <th scope="col" className={studioTh}>
                    Status
                  </th>
                  <th scope="col" className={studioTh}>
                    Sales stage
                  </th>
                  <th scope="col" className={studioTh}>
                    Price
                  </th>
                  <th scope="col" className={studioTh}>
                    Assignments
                  </th>
                  <th scope="col" className={studioTh}>
                    Published
                  </th>
                  <th scope="col" className={studioTh}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr key={project.id}>
                    <td className={studioTd}>
                      <div className="flex items-center gap-3">
                        {project.image ? (
                          // Studio thumbnails: plain img, no optimizer config needed for CMS hosts.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={project.image}
                            alt=""
                            className="h-10 w-14 shrink-0 rounded-md object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="h-10 w-14 shrink-0 rounded-md bg-surface-alt" aria-hidden="true" />
                        )}
                        <div className="min-w-0">
                          <Link href={`/studio/precon/${project.id}`} className="studio-cell-title hover:text-navy">
                            {project.title}
                          </Link>
                          <p className="studio-cell-meta">
                            #{project.id}
                            {project.developer ? ` · ${project.developer}` : ""}
                            {project.isFeatured
                              ? ` · Featured${project.featuredOrder ? ` #${project.featuredOrder}` : ""}`
                              : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={studioTd}>
                      <PreconStatusPill status={project.status} />
                    </td>
                    <td className={cn(studioTd, "text-ink-muted")}>
                      {salesStageLabel(project.salesStage) ?? "—"}
                    </td>
                    <td className={cn(studioTd, "text-ink-muted")}>
                      {project.price ? formatPrice(project.price) : "—"}
                    </td>
                    <td className={cn(studioTd, "text-ink-muted")}>{project.assignmentCount || "—"}</td>
                    <td className={cn(studioTd, "text-ink-muted")}>
                      {project.publishedAt ? formatDate(project.publishedAt) : "—"}
                    </td>
                    <td className={studioTd}>
                      <div className="flex justify-end gap-3 text-caption">
                        <Link href={`/studio/precon/${project.id}`} className="text-ink-muted hover:text-navy">
                          Edit
                        </Link>
                        {project.status === "publish" && (
                          <Link
                            href={preconPath(project.id, project.slug || project.title)}
                            className="text-ink-muted hover:text-navy"
                          >
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
