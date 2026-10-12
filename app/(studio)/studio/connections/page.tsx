import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-h1 text-ink">Connections</h1>
        <p className="mt-2 max-w-2xl text-small text-ink-muted">
          Keys for the website and the server. Saving here updates the live site. Leave a secret blank to keep what is already saved. The database password stays in hosting and is not on this page.
        </p>
      </div>
      {error || !initial ? (
        <p role="alert" className="rounded-surface border border-negative/30 bg-surface p-4 text-small text-ink">
          {error || "Could not load connections."}
        </p>
      ) : (
        <ConnectionsEditor initial={initial} />
      )}
    </div>
  );
}
