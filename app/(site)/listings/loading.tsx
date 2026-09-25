import { PropertyGridSkeleton, Skeleton } from "@/components/ui/States";

/**
 * Shown the moment someone navigates to /listings from another page (the
 * hero search, a nav link), until the page's first render streams in.
 * Filter changes within the page use PendingNavigation instead.
 */
export default function ListingsLoading() {
  return (
    <>
      <header className="border-b border-line bg-surface-alt py-7 sm:py-10">
        <div className="container-page space-y-2">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-48" />
        </div>
      </header>
      <div className="container-page space-y-8 py-8">
        <Skeleton className="h-24 w-full" />
        <PropertyGridSkeleton />
      </div>
    </>
  );
}
