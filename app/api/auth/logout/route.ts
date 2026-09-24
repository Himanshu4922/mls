import { NextResponse } from "next/server";
import { clearSessionCookies } from "@/lib/auth/session";

/** POST /api/auth/logout — clears the session cookies. */
export async function POST() {
  await clearSessionCookies();
  return NextResponse.json({ ok: true });
}
