import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { completeSocialSignIn } from "@/lib/auth/social";

/**
 * POST /api/auth/social — Google / Facebook sign-in.
 *
 * Google accepts either an `id_token` (One Tap / GSI) or an OAuth `code`;
 * Facebook requires a `code` plus the `redirect_uri` used to obtain it. Both
 * return a JWT pair, which we store in httpOnly cookies exactly like password
 * sign-in, so the rest of the app is unaware of how the user authenticated.
 *
 * The modal's Facebook button does not use this route — it runs the redirect
 * flow in /api/auth/facebook/* — but a popup-based client could.
 */
export async function POST(request: Request) {
  let body: {
    provider?: "google" | "facebook";
    id_token?: string;
    code?: string;
    redirect_uri?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const provider = body.provider;
  if (provider !== "google" && provider !== "facebook") {
    return NextResponse.json(
      { error: "provider must be google or facebook." },
      { status: 400 },
    );
  }
  if (!body.id_token && !body.code) {
    return NextResponse.json(
      { error: "An id_token or code is required." },
      { status: 400 },
    );
  }

  const payload =
    provider === "google"
      ? { id_token: body.id_token, code: body.code }
      : { code: body.code, redirect_uri: body.redirect_uri };

  try {
    const user = await completeSocialSignIn(provider, payload);
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Sign in failed." }, { status: 500 });
  }
}
