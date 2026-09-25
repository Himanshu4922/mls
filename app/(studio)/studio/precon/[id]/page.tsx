import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreconEditor } from "@/components/studio/PreconEditor";
import { ApiError } from "@/lib/api/client";
import { getStudioPrecon, type StudioPrecon } from "@/lib/api/studioAdmin";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Edit project" };
export const dynamic = "force-dynamic";

export default async function EditPreconPage({ params }: PageProps<"/studio/precon/[id]">) {
  const session = await requireStudioAccess();
  if (!session || !session.user.isStaff) notFound();

  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id) || id <= 0) notFound();

  let project: StudioPrecon;
  try {
    project = await getStudioPrecon(session.token, id);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    return (
      <p role="alert" className="rounded-surface border border-negative/30 bg-surface p-4 text-small text-ink">
        We couldn&apos;t load this project. Refresh to try again.
      </p>
    );
  }
  // Keyed so saving (which replaces the server data) remounts with fresh state.
  return <PreconEditor key={project.id} project={project} />;
}
