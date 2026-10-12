import { TopRatedSchools } from "@/components/home/sections/TopRatedSchools";
import { getTopSchools } from "@/lib/api/schools";

/** Public homepage. The studio preview stays on the sync component. */
export async function TopRatedSchoolsLive({ content }: { content?: Record<string, unknown> }) {
  const schools = await getTopSchools().catch(() => []);
  return <TopRatedSchools content={content} schools={schools} />;
}
