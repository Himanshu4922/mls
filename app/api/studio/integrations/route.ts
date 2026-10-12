import { NextResponse } from "next/server";
import { errorResponse, guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { getStudioConnections, saveStudioConnections } from "@/lib/api/integrations";

export async function GET() {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  try {
    return NextResponse.json(await getStudioConnections(session.token));
  } catch (error) {
    return errorResponse(error, "Could not load connections.");
  }
}

export async function PUT(request: Request) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  let body: { values?: Record<string, string>; clear?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const values = body.values && typeof body.values === "object" ? body.values : {};
  const clear = Array.isArray(body.clear) ? body.clear.filter((key) => typeof key === "string") : [];
  try {
    return NextResponse.json(await saveStudioConnections(session.token, values, clear));
  } catch (error) {
    return errorResponse(error, "Could not save connections.");
  }
}
