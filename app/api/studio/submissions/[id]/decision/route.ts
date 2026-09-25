import { NextResponse } from "next/server";
import { errorResponse, guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { revalidateAssignmentPages } from "@/app/api/studio/precon/_revalidate";
import { decideSubmission, type DecisionInput } from "@/lib/api/studioAdmin";

/** POST /api/studio/submissions/<id>/decision — approve, reject, request changes, start review. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const id = Number.parseInt((await params).id, 10);
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid submission." }, { status: 400 });
  }

  let body: DecisionInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const submission = await decideSubmission(session.token, id, body);
    revalidateAssignmentPages();
    return NextResponse.json({ submission });
  } catch (error) {
    return errorResponse(error, "Could not record that decision.");
  }
}
