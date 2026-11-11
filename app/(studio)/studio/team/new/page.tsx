import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TeamInviteForm } from "@/components/studio/TeamInviteForm";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Add team member" };
export const dynamic = "force-dynamic";

export default async function NewTeamMemberPage() {
  const session = await requireStudioAccess();
  if (!session || !session.user.isStaff) notFound();
  return <TeamInviteForm />;
}
