import { Skeleton } from "@/components/ui/States";

export default function MapLoading() {
  return (
    <div role="status" aria-label="Loading map search" aria-busy="true" className="flex h-[100dvh] flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-24" />
      </div>
      <div className="grid min-h-0 flex-1 lg:grid-cols-[22rem_minmax(0,1fr)]">
        <div className="hidden space-y-3 overflow-hidden border-r border-line p-4 lg:block">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-full min-h-[50vh] w-full rounded-none" />
      </div>
      <span className="sr-only">Loading map search…</span>
    </div>
  );
}
