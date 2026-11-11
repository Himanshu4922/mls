export default function SchoolsLoading() {
  return (
    <div className="container-page py-10" role="status" aria-label="Loading schools">
      <div className="rounded-surface border border-line bg-surface p-5">
        <div className="h-12 max-w-xl animate-pulse rounded-control bg-surface-alt" />
        <div className="mt-4 flex gap-2">
          <div className="h-8 w-16 animate-pulse rounded-full bg-surface-alt" />
          <div className="h-8 w-24 animate-pulse rounded-full bg-surface-alt" />
          <div className="h-8 w-28 animate-pulse rounded-full bg-surface-alt" />
        </div>
      </div>
      <div className="mt-8 overflow-hidden rounded-surface border border-line">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-4 border-b border-line px-5 py-4 last:border-b-0"
          >
            <div className="h-10 w-12 animate-pulse rounded bg-surface-alt" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="h-4 w-2/3 animate-pulse rounded bg-surface-alt" />
              <div className="h-3 w-1/3 animate-pulse rounded bg-surface-alt" />
            </div>
            <div className="h-10 w-40 animate-pulse rounded-control bg-surface-alt" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading schools…</span>
    </div>
  );
}