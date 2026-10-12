import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioAlert, StudioPage } from "@/components/studio/chrome";
import { ConnectionsEditor } from "@/components/studio/ConnectionsEditor";
import { getStudioConnections } from "@/lib/api/integrations";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Connections" };
export const dynamic = "force-dynamic";

export default async function StudioConnectionsPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();

  let error = "";
  let initial = null;
  try {
    initial = await getStudioConnections(session.token);
  } catch {
    error = "Could not load connections. Refresh to try again.";
  }

  return (
    <StudioPage
      kicker="Workspace"
      title="Connections"
      description="The value in use for each setting. Save stores it in this console and the site starts using it. Remove clears only that saved value."
    >
      {error || !initial ? <StudioAlert>{error || "Could not load connections."}</StudioAlert> : <ConnectionsEditor initial={initial} />}
    </StudioPage>
  );
}
