import { NextResponse } from "next/server";
import { subscribeNewsletter } from "@/lib/api/homeForms";
import { requireAccessToken } from "@/lib/auth/session";
import { clientIp, fail, homeErrorJson, readJsonObject } from "../_forms";

/**
 * POST /api/home/newsletter — proxies `POST /api/home/newsletter/subscribe/`.
 *
 * Open to guests; the session token is attached when there is one so the
 * subscription links to the account. Consent must be an explicit `true`
 * (CASL) — the proxy checks it too so a missing tick never reaches the backend.
 */
export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return fail("Invalid request.", 400);

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (!email) {
    return NextResponse.json(
      { error: "Enter your email address.", fieldErrors: { email: "Enter your email address." } },
      { status: 400 },
    );
  }
  if (body.consent !== true) {
    const message = "Please confirm you agree to receive emails.";
    return NextResponse.json({ error: message, fieldErrors: { consent: message } }, { status: 400 });
  }
  const source = typeof body.source === "string" ? body.source.slice(0, 80) : undefined;

  const token = await requireAccessToken();
  try {
    const result = await subscribeNewsletter(
      { email, source },
      { token, clientIp: clientIp(request) },
    );
    return NextResponse.json(result ?? { subscribed: true }, { status: 201 });
  } catch (error) {
    return homeErrorJson(error, "Could not subscribe you. Please try again.");
  }
}
