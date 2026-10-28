import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommunityPhotosManager } from "@/components/studio/site/CommunityPhotosManager";
import { StudioAlert, StudioPage } from "@/components/studio/chrome";
import { apiFetch } from "@/lib/api/client";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Community photos" };
export const dynamic = "force-dynamic";

export default async function CommunitiesPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();

  let rows: Array<Record<string, unknown>> = [];
  try {
    const body = await apiFetch<{ results: Array<Record<string, unknown>> }>(
      "/api/home/studio/community-images/",
      { token: session.token },
    );
    rows = body.results ?? [];
  } catch {
    return (
      <StudioPage kicker="Editorial" title="Community photos" description="Photos for community tiles.">
        <StudioAlert>Could not load saved community photos. Refresh to try again.</StudioAlert>
      </StudioPage>
    );
  }

  return <CommunityPhotosManager rows={rows} />;
}
