import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import { requireAccessToken } from "@/lib/auth/session";

/**
 * POST /api/auth/otp — phone verification.
 *
 * `action: "send"` requests a code (mls-v2 `send-otp/`), `action: "verify"`
 * confirms it (`verify-otp/`). Both are authenticated: the OTP flow verifies the
 * phone on an existing account rather than creating one.
 */
export async function POST(request: Request) {
  let body: { action?: string; phone?: string; code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const token = await requireAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const isVerify = body.action === "verify";
  if (isVerify && !body.code) {
    return NextResponse.json({ error: "code is required." }, { status: 400 });
  }
  // verify-otp/ needs the phone too: Twilio checks the code against the number
  // it was sent to, and the backend stores that number on success.
  if (!body.phone) {
    return NextResponse.json({ error: "phone is required." }, { status: 400 });
  }

  try {
    const result = await apiFetch<Record<string, unknown>>(
      isVerify ? "/api/auth/verify-otp/" : "/api/auth/send-otp/",
      {
        method: "POST",
        token,
        body: isVerify ? { phone: body.phone, code: body.code } : { phone: body.phone },
      },
    );
    return NextResponse.json(result ?? { ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Verification failed." }, { status: 500 });
  }
}
