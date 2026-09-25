import { StudioTableSkeleton } from "@/components/studio/StudioSkeletons";

export default function Loading() {
  return <StudioTableSkeleton label="Loading projects" tabs={5} />;
}
