import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";

/** POST /api/auth/resend-verification — re-sends the account verification email. */
export async function POST(request: Request) {
  let body: { email?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.email) {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  try {
    const result = await apiFetch<{ detail?: string }>(
      "/api/auth/resend-verification/",
      { method: "POST", body: { email: body.email } },
    );
    return NextResponse.json({ detail: result?.detail ?? "Verification email sent." });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Could not resend the email." }, { status: 500 });
  }
}
