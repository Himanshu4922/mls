import { ArticleSkeletonBody } from "@/components/studio/StudioSkeletons";
import { Skeleton } from "@/components/ui/States";

/** Mirrors the /blog/[slug] header + body layout so the swap-in doesn't jump. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading article" aria-busy="true" className="pb-16">
      <div className="border-b border-line bg-surface-alt py-8 sm:py-12">
        <div className="container-page max-w-3xl space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="mt-4 h-3 w-20" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="container-page max-w-3xl py-10">
        <ArticleSkeletonBody />
      </div>
      <span className="sr-only">Loading article…</span>
    </div>
  );
}
