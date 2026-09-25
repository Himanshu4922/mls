import { StudioTableSkeleton } from "@/components/studio/StudioSkeletons";

export default function Loading() {
  return <StudioTableSkeleton label="Loading review queue" tabs={5} />;
}
