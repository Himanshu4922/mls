import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";

/** GET /api/auth/me — resolves the current user, refreshing the token if needed. */
export async function GET() {
  const user = await getCurrentUser();
  return NextResponse.json({ user });
}
