import { NextResponse } from "next/server";
import { addHistory } from "@/lib/api/watched";
import { requireAccessToken } from "@/lib/auth/session";

/**
 * POST /api/watched/history — record a viewed listing.
 * Signed-out visitors get a silent no-op; viewing history is account data.
 */
export async function POST(request: Request) {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ ok: false, reason: "anonymous" });

  let body: { property_key?: string; snapshot?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.property_key) {
    return NextResponse.json({ error: "property_key is required." }, { status: 400 });
  }

  try {
    await addHistory(token, body.property_key, body.snapshot ?? {});
    return NextResponse.json({ ok: true });
  } catch {
    // History is best-effort telemetry; never surface a failure to the user.
    return NextResponse.json({ ok: false });
  }
}
