import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-ink">Team</h1>
        <p className="mt-1 max-w-2xl text-small text-ink-muted">
          People who can write and publish blog posts. Everyone here signs in
          with their own account — nobody shares a password.
        </p>
      </div>

      {error ? (
        <p role="alert" className="rounded-surface border border-negative/30 bg-surface p-4 text-small text-ink">
          {error}
        </p>
      ) : (
        <TeamManager members={members} currentUserId={session.user.id} />
      )}
    </div>
  );
}
