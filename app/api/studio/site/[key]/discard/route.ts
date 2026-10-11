import { NextResponse } from "next/server";
import { guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { discardStudioSite } from "@/lib/api/siteAdmin";
import { isSiteKey, siteError } from "@/app/api/studio/site/_shared";

type Params = { params: Promise<{ key: string }> };

export async function POST(request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const { key } = await params;
  if (!isSiteKey(key)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: { expected_updated_at?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    return NextResponse.json(await discardStudioSite(session.token, key, body.expected_updated_at || ""));
  } catch (error) {
    return siteError(error, "Could not discard the draft.");
  }
}
