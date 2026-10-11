import { NextResponse } from "next/server";
import { guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { listSiteRevisions } from "@/lib/api/siteAdmin";
import { isSiteKey, siteError } from "@/app/api/studio/site/_shared";

type Params = { params: Promise<{ key: string }> };

export async function GET(_request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const { key } = await params;
  if (!isSiteKey(key)) return NextResponse.json({ error: "Not found." }, { status: 404 });
  try {
    return NextResponse.json(await listSiteRevisions(session.token, key));
  } catch (error) {
    return siteError(error, "Could not load previous versions.");
  }
}
