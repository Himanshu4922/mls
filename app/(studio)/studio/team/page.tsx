import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioAlert, StudioPage } from "@/components/studio/chrome";
import { TeamManager } from "@/components/studio/TeamManager";
import { listTeam, type TeamMember } from "@/lib/api/studio";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

export default async function StudioTeamPage() {
  const session = await requireStudioAccess();
  // Team management is staff-only — a stricter bar than the rest of the Studio,
  // so a writer cannot grant access to anyone else. The API enforces this too.
  if (!session || !session.user.isStaff) notFound();

  let members: TeamMember[] = [];
  let error: string | null = null;
  try {
    members = await listTeam(session.token);
  } catch {
    error = "We couldn't load the team list. Refresh to try again.";
  }

  return (
    <StudioPage
      kicker="Workspace"
      title="Team"
      description="People who can write and publish blog posts. Everyone signs in with their own account."
    >
      {error ? <StudioAlert>{error}</StudioAlert> : <TeamManager members={members} currentUserId={session.user.id} />}
    </StudioPage>
  );
}
