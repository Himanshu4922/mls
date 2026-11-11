export default function SchoolsLoading() {
  return (
    <div className="container-page py-10" role="status" aria-label="Loading schools">
      <div className="h-8 w-48 animate-pulse rounded bg-surface-alt" />
      <div className="mt-4 h-12 max-w-xl animate-pulse rounded-control bg-surface-alt" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-surface border border-line">
            <div className="h-32 animate-pulse bg-surface-alt" />
            <div className="space-y-2 p-3.5">
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-alt" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-surface-alt" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading schools…</span>
    </div>
  );
}