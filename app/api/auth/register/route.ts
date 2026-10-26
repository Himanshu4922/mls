import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";

/**
 * POST /api/auth/register
 *
 * Proxies mls-v2 `POST /api/auth/register/`.
 *
 * NOTE: registration does NOT return tokens. The backend creates the user with
 * is_active=False and emails a 24h verification link, so the UI must show a
 * "check your email" state rather than treating sign-up as signed-in.
 *
 * Notification prefs from the signup accordion are forwarded so they land on
 * UserAlertPreference before the user can call the authenticated prefs API.
 */

type RegisterBody = {
  name?: string;
  email?: string;
  password?: string;
  phone?: string;
  agreeTerms?: boolean;
  emailRecommend?: boolean;
  emailWatchedProperty?: boolean;
  emailWatchedCommunity?: boolean;
  emailWatchedArea?: boolean;
  pushWatchedProperty?: boolean;
};

export async function POST(request: Request) {
  let body: RegisterBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const missing = (["name", "email", "password", "phone"] as const).filter(
    (key) => !body[key],
  );
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required ${missing.length > 1 ? "fields" : "field"}: ${missing.join(", ")}.` },
      { status: 400 },
    );
  }

  if (body.agreeTerms !== true) {
    return NextResponse.json(
      { error: "You must agree to the Terms & Conditions and Privacy Policy." },
      { status: 400 },
    );
  }

  const payload = {
    name: body.name,
    email: body.email,
    password: body.password,
    phone: body.phone,
    agree_terms: true,
    email_recommend: body.emailRecommend ?? true,
    email_watched_property: body.emailWatchedProperty ?? true,
    email_watched_community: body.emailWatchedCommunity ?? true,
    email_watched_area: body.emailWatchedArea ?? true,
    push_watched_property: body.pushWatchedProperty ?? true,
  };

  try {
    const result = await apiFetch<{ detail?: string }>("/api/auth/register/", {
      method: "POST",
      body: payload,
    });
    return NextResponse.json({
      detail: result?.detail ?? "Check your email to verify your account.",
      verificationRequired: true,
    });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Registration failed." }, { status: 500 });
  }
}
