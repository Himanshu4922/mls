import { Skeleton } from "@/components/ui/States";

/**
 * Loading placeholders for each Studio screen, shaped like the real layout so
 * nothing jumps when the content streams in. Used by the routes' `loading.tsx`.
 */

function Loading({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-label={label} aria-busy="true">
      {children}
      <span className="sr-only">{label}…</span>
    </div>
  );
}

function PageHeader({ action = true }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="space-y-2">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      {action && <Skeleton className="h-9 w-28" />}
    </div>
  );
}

function TableRows({ rows, columns }: { rows: number; columns: string[] }) {
  return (
    <div className="overflow-hidden rounded-surface border border-line bg-surface">
      <div className="flex gap-6 border-b border-line px-4 py-3">
        {columns.map((width, i) => (
          <Skeleton key={i} className={`h-3 ${width}`} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, row) => (
        <div key={row} className="flex items-center gap-6 border-b border-line/60 px-4 py-4 last:border-0">
          {columns.map((width, i) => (
            <Skeleton key={i} className={`${i === 0 ? "h-4" : "h-3"} ${width}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function PostListSkeleton() {
  return (
    <Loading label="Loading posts">
      <div className="space-y-6">
        <PageHeader />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-full" />
            ))}
          </div>
          <Skeleton className="ml-auto h-10 w-full sm:max-w-xs" />
        </div>
        <TableRows rows={6} columns={["flex-1", "w-20", "w-24", "w-24", "w-28"]} />
      </div>
    </Loading>
  );
}

/** Pre-con list and the assignment review queue: header, filter row, table. */
export function StudioTableSkeleton({ label, tabs = 4 }: { label: string; tabs?: number }) {
  return (
    <Loading label={label}>
      <div className="space-y-6">
        <PageHeader />
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5">
            {Array.from({ length: tabs }).map((_, i) => (
              <Skeleton key={i} className="h-7 w-24 rounded-full" />
            ))}
          </div>
          <Skeleton className="ml-auto h-10 w-full sm:max-w-xs" />
        </div>
        <TableRows rows={6} columns={["w-14", "flex-1", "w-20", "w-24", "w-24", "w-20"]} />
      </div>
    </Loading>
  );
}

/** Pre-con editor and submission review: main column plus a side panel. */
export function StudioFormSkeleton({ label }: { label: string }) {
  return (
    <Loading label={label}>
      <div className="space-y-5">
        <PageHeader />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="space-y-4">
            <SidePanel fields={4} />
            <SidePanel fields={3} />
          </div>
          <div className="space-y-4">
            <SidePanel fields={3} />
            <SidePanel fields={2} />
          </div>
        </div>
      </div>
    </Loading>
  );
}

export function TeamSkeleton() {
  return (
    <Loading label="Loading team">
      <div className="space-y-6">
        <PageHeader action={false} />
        <div className="space-y-3 rounded-surface border border-line bg-surface p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-80 max-w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <TableRows rows={4} columns={["w-32", "flex-1", "w-24", "w-24", "w-16"]} />
      </div>
    </Loading>
  );
}

function SidePanel({ fields }: { fields: number }) {
  return (
    <div className="space-y-3 rounded-surface border border-line bg-surface p-4">
      <Skeleton className="h-4 w-24" />
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <Loading label="Loading editor">
      <div className="space-y-5">
        <div className="-mx-4 -mt-6 flex items-center gap-3 border-b border-line px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:h-14 lg:px-8 lg:py-0">
          <Skeleton className="h-4 w-16" />
          <div className="ml-auto flex gap-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] 2xl:grid-cols-[minmax(0,1fr)_26rem]">
          <div className="space-y-4">
            <Skeleton className="h-14 w-full rounded-surface" />
            <div className="overflow-hidden rounded-surface border border-line bg-surface">
              <div className="flex gap-1.5 border-b border-line px-2 py-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-6 w-9" />
                ))}
              </div>
              <div className="space-y-3 p-4">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="mt-6 h-5 w-1/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/6" />
                <div className="h-[calc(100dvh-34rem)] min-h-24" />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <SidePanel fields={3} />
            <SidePanel fields={3} />
            <SidePanel fields={1} />
          </div>
        </div>
      </div>
    </Loading>
  );
}

/** Article header + body lines; shared by the Studio preview and /blog/[slug]. */
export function ArticleSkeletonBody() {
  return (
    <div className="space-y-3">
      {["w-full", "w-full", "w-11/12", "w-4/6"].map((w, i) => (
        <Skeleton key={i} className={`h-4 ${w}`} />
      ))}
      <Skeleton className="mt-8 h-6 w-1/2" />
      {["w-full", "w-full", "w-10/12", "w-full", "w-3/5"].map((w, i) => (
        <Skeleton key={i} className={`h-4 ${w}`} />
      ))}
      <Skeleton className="mt-8 h-32 w-full rounded-surface" />
    </div>
  );
}

export function PreviewSkeleton() {
  return (
    <Loading label="Loading preview">
      <div className="space-y-6">
        <Skeleton className="h-12 w-full rounded-surface" />
        <div className="rounded-surface border border-line bg-surface px-5 py-8 sm:px-10">
          <div className="mx-auto max-w-3xl space-y-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-3 w-28" />
            <div className="pt-6">
              <ArticleSkeletonBody />
            </div>
          </div>
        </div>
      </div>
    </Loading>
  );
}
