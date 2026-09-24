import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { updateAlertPreferences, type AlertPreferences } from "@/lib/api/watched";
import { requireAccessToken } from "@/lib/auth/session";

/** POST /api/watched/alerts — update listing-alert preferences. */
export async function POST(request: Request) {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: Partial<AlertPreferences>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    return NextResponse.json(await updateAlertPreferences(token, body));
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Could not save preferences." }, { status: 500 });
  }
}
