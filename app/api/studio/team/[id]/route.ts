import { NextResponse } from "next/server";
import { errorResponse, guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { revokeTeamAccess } from "@/lib/api/studio";

/** DELETE /api/studio/team/<id> — revoke a member's Studio access. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;

  const { id } = await params;
  const userId = Number.parseInt(id, 10);
  if (!Number.isFinite(userId)) {
    return NextResponse.json({ error: "Invalid user." }, { status: 400 });
  }

  try {
    await revokeTeamAccess(session.token, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorResponse(error, "Could not revoke access.");
  }
}
