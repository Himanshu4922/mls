import { NextResponse } from "next/server";
import { guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { publishStudioSite } from "@/lib/api/siteAdmin";
import { isSiteKey, revalidateSite, siteError } from "@/app/api/studio/site/_shared";

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
    const record = await publishStudioSite(session.token, key, body.expected_updated_at || "");
    revalidateSite();
    return NextResponse.json(record);
  } catch (error) {
    return siteError(error, "Could not publish.");
  }
}
