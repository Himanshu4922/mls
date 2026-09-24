import { NextResponse } from "next/server";
import { getWatchedOverview } from "@/lib/api/watched";
import { requireAccessToken } from "@/lib/auth/session";

/** GET /api/watched — the full saved surface for the signed-in user. */
export async function GET() {
  const token = await requireAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  try {
    return NextResponse.json(await getWatchedOverview(token));
  } catch {
    return NextResponse.json({ error: "Could not load saved homes." }, { status: 502 });
  }
}
