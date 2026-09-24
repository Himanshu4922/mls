import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { toggleToured } from "@/lib/api/watched";
import { requireAccessToken } from "@/lib/auth/session";

/** POST /api/watched/toured — mark a home as toured / untoured. */
export async function POST(request: Request) {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

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
    const result = await toggleToured(token, body.property_key, body.snapshot ?? {});
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Could not update." }, { status: 500 });
  }
}
