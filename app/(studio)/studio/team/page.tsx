import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioAlert, StudioPage } from "@/components/studio/chrome";
import { TeamManager } from "@/components/studio/TeamManager";
import { LinkButton } from "@/components/ui/Button";
import { listTeam, type TeamMember } from "@/lib/api/studio";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Team" };
export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ added?: string }> };

export default async function StudioTeamPage({ searchParams }: PageProps) {
  const session = await requireStudioAccess();
  // Team management is staff-only — a stricter bar than the rest of the Studio,
  // so a writer cannot grant access to anyone else. The API enforces this too.
  if (!session || !session.user.isStaff) notFound();
  const params = await searchParams;

  let members: TeamMember[] = [];
  let error: string | null = null;
  try {
    members = await listTeam(session.token);
  } catch {
    error = "We couldn't load the team list. Refresh to try again.";
  }

  return (
    <StudioPage
      title="Team"
      description="Writers manage blog posts. Administrators manage the full console."
      toolbar={
        <LinkButton href="/studio/team/new" size="sm">
          + Add team member
        </LinkButton>
      }
    >
      {error ? (
        <StudioAlert>{error}</StudioAlert>
      ) : (
        <TeamManager
          members={members}
          currentUserId={session.user.id}
          justAdded={params.added === "1"}
        />
      )}
    </StudioPage>
  );
}
