import { NextResponse } from "next/server";
import { errorResponse, guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { revokeTeamAccess, updateTeamRole, type TeamRole } from "@/lib/api/studio";

type Params = { params: Promise<{ id: string }> };

function parseUserId(id: string): number | null {
  const userId = Number.parseInt(id, 10);
  return Number.isFinite(userId) ? userId : null;
}

/** PATCH /api/studio/team/<id> — change Writer / Administrator access. */
export async function PATCH(request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;

  const { id } = await params;
  const userId = parseUserId(id);
  if (userId === null) {
    return NextResponse.json({ error: "Invalid user." }, { status: 400 });
  }

  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const role: TeamRole | null = body.role === "admin" ? "admin" : body.role === "author" ? "author" : null;
  if (!role) {
    return NextResponse.json({ error: 'Role must be "author" or "admin".' }, { status: 400 });
  }

  try {
    return NextResponse.json({ member: await updateTeamRole(session.token, userId, role) });
  } catch (error) {
    return errorResponse(error, "Could not update access.");
  }
}

/** DELETE /api/studio/team/<id> — revoke a member's Studio access. */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;

  const { id } = await params;
  const userId = parseUserId(id);
  if (userId === null) {
    return NextResponse.json({ error: "Invalid user." }, { status: 400 });
  }

  try {
    await revokeTeamAccess(session.token, userId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, "Could not revoke access.");
  }
}
