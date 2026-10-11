import { NextResponse } from "next/server";
import { guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { getStudioSite, saveStudioSite } from "@/lib/api/siteAdmin";
import { isSiteKey, siteError } from "@/app/api/studio/site/_shared";

type Params = { params: Promise<{ key: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const { key } = await params;
  if (!isSiteKey(key)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    return NextResponse.json(await getStudioSite(session.token, key));
  } catch (error) {
    return siteError(error, "Could not load this page.");
  }
}

export async function PUT(request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const { key } = await params;
  if (!isSiteKey(key)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  let body: { draft?: unknown; expected_updated_at?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    return NextResponse.json(await saveStudioSite(session.token, key, body.draft, body.expected_updated_at || ""));
  } catch (error) {
    return siteError(error, "Could not save the draft.");
  }
}
