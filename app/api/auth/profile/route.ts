import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import { mapUser } from "@/lib/api/mappers";
import { requireAccessToken, clearSessionCookies } from "@/lib/auth/session";
import type { BackendUserProfile } from "@/lib/types/backend";

/**
 * GET /api/auth/profile — current user profile.
 * PATCH /api/auth/profile — update name / email / phone (proxies mls-v2 profile/).
 *
 * Email changes trigger re-verification on the backend (`email_verification_sent`).
 * Phone changes clear `phone_verified`.
 */

export async function GET() {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  try {
    const profile = await apiFetch<BackendUserProfile>("/api/auth/profile/", { token });
    return NextResponse.json({ user: mapUser(profile) });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Could not load profile." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Only forward fields the backend profile serializer accepts for write.
  const payload: Record<string, unknown> = {};
  for (const key of ["name", "first_name", "last_name", "email", "phone"] as const) {
    if (key in body && body[key] !== undefined) payload[key] = body[key];
  }

  // Convenience: split a single `name` into first/last for the backend.
  if (typeof payload.name === "string" && !("first_name" in payload)) {
    const parts = payload.name.trim().split(/\s+/, 2);
    payload.first_name = parts[0] ?? "";
    payload.last_name = parts[1] ?? "";
    delete payload.name;
  }

  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: "No profile fields to update." }, { status: 400 });
  }

  try {
    const profile = await apiFetch<BackendUserProfile & { email_verification_sent?: boolean }>(
      "/api/auth/profile/",
      { method: "PUT", token, body: payload },
    );

    // Email change deactivates the account until re-verified — clear the local
    // session so the UI does not keep acting as signed-in against a dead token.
    if (profile.email_verification_sent) {
      await clearSessionCookies();
      return NextResponse.json({
        user: mapUser(profile),
        emailVerificationSent: true,
        detail: "Check your new email address for a verification link.",
      });
    }

    return NextResponse.json({ user: mapUser(profile) });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Could not update profile." }, { status: 500 });
  }
}
