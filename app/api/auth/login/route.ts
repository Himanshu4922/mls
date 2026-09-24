import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import { mapUser } from "@/lib/api/mappers";
import { setSessionCookies } from "@/lib/auth/session";
import type { BackendTokenPair, BackendUserProfile } from "@/lib/types/backend";

/**
 * POST /api/auth/login
 *
 * Proxies mls-v2 `POST /api/auth/login/` and stores the JWT pair in httpOnly
 * cookies. The backend answers 401 for bad credentials and 403 when the email
 * has not been verified — we pass that distinction through so the UI can offer
 * to resend the verification email.
 */
export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!body.email || !body.password) {
    return NextResponse.json(
      { error: "Email and password are required." },
      { status: 400 },
    );
  }

  try {
    const tokens = await apiFetch<BackendTokenPair>("/api/auth/login/", {
      method: "POST",
      body: { email: body.email, password: body.password },
    });

    await setSessionCookies(tokens);

    // The login payload may omit the profile; fetch it so the client has a user.
    let user = tokens.user ? mapUser(tokens.user) : null;
    if (!user) {
      try {
        const profile = await apiFetch<BackendUserProfile>("/api/auth/profile/", {
          token: tokens.access,
        });
        user = mapUser(profile);
      } catch {
        user = null;
      }
    }

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          error: error.message,
          // Lets the UI surface a "resend verification email" action.
          needsVerification: error.status === 403,
        },
        { status: error.status || 500 },
      );
    }
    return NextResponse.json({ error: "Sign in failed." }, { status: 500 });
  }
}
