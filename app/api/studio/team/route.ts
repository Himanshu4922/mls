import { NextResponse } from "next/server";
import { errorResponse, guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { grantTeamAccess, listTeam } from "@/lib/api/studio";

/**
 * Team management is STAFF-only, a higher bar than the rest of the Studio: a
 * writer may publish posts but must not be able to grant access to others.
 */

/** GET /api/studio/team */
export async function GET() {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;

  try {
    return NextResponse.json({ members: await listTeam(session.token) });
  } catch (error) {
    return errorResponse(error, "Could not load the team.");
  }
}

/** POST /api/studio/team — grant Studio access by email. */
export async function POST(request: Request) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;

  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  if (!email) {
    return NextResponse.json({ error: "An email address is required." }, { status: 400 });
  }

  try {
    return NextResponse.json({ member: await grantTeamAccess(session.token, email) });
  } catch (error) {
    return errorResponse(error, "Could not grant access.");
  }
}
