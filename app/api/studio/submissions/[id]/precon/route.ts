import { NextResponse } from "next/server";
import { errorResponse, guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { revalidateAssignmentPages } from "@/app/api/studio/precon/_revalidate";
import { linkSubmissionPrecon } from "@/lib/api/studioAdmin";

/** PATCH /api/studio/submissions/<id>/precon — link (or unlink) a pre-con project. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  let body: { precon_property?: number | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const preconId = typeof body.precon_property === "number" ? body.precon_property : null;
  try {
    const submission = await linkSubmissionPrecon(session.token, id, preconId);
    revalidateAssignmentPages();
    return NextResponse.json({ submission });
  } catch (error) {
    return errorResponse(error, "Could not link that project.");
  }
}
