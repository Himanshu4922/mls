import { NextResponse, type NextRequest } from "next/server";
import {
  FACEBOOK_APP_ID,
  FACEBOOK_GRAPH_VERSION,
  createState,
  facebookRedirectUri,
  resolveNext,
  sanitizeNext,
  setStateCookie,
} from "@/lib/auth/facebook";

/**
 * GET /api/auth/facebook/start?next=/path — begins Facebook Login.
 *
 * Mints a random `state`, pins it (and the sanitized return path) in a
 * short-lived httpOnly cookie, and sends the browser to Facebook's OAuth dialog.
 * The callback only accepts a response whose `state` matches that cookie, which
 * is what stops a forged callback from signing a victim into someone else's
 * account (login CSRF).
 */
export function GET(request: NextRequest) {
  const next = sanitizeNext(request.nextUrl.searchParams.get("next"));

  // The button is hidden without an app id, so this is a misconfiguration or a
  // hand-typed URL; send the visitor back with a readable error, not a 500.
  if (!FACEBOOK_APP_ID) {
    return NextResponse.redirect(resolveNext(request, next, "facebook"));
  }

  const state = createState();
  const dialog = new URL(`https://www.facebook.com/${FACEBOOK_GRAPH_VERSION}/dialog/oauth`);
  dialog.searchParams.set("client_id", FACEBOOK_APP_ID);
  dialog.searchParams.set("redirect_uri", facebookRedirectUri(request));
  dialog.searchParams.set("state", state);
  dialog.searchParams.set("response_type", "code");
  // The backend refuses accounts without an email, so ask for it up front.
  dialog.searchParams.set("scope", "email,public_profile");

  const response = NextResponse.redirect(dialog);
  setStateCookie(response, state, next);
  return response;
}
