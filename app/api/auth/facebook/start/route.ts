import { NextResponse, type NextRequest } from "next/server";
import { getPublicConnections } from "@/lib/api/integrations";
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
export async function GET(request: NextRequest) {
  const next = sanitizeNext(request.nextUrl.searchParams.get("next"));
  const connections = await getPublicConnections();
  const appId = connections.facebookAppId || FACEBOOK_APP_ID;
  const version = (connections.facebookGraphVersion || FACEBOOK_GRAPH_VERSION).replace(/^\/+/, "");
  const siteUrl = connections.siteUrl || null;

  // The button is hidden without an app id, so this is a misconfiguration or a
  // hand-typed URL; send the visitor back with a readable error, not a 500.
  if (!appId) {
    return NextResponse.redirect(resolveNext(request, next, "facebook", siteUrl));
  }

  const state = createState();
  const dialog = new URL(`https://www.facebook.com/${version}/dialog/oauth`);
  dialog.searchParams.set("client_id", appId);
  dialog.searchParams.set("redirect_uri", facebookRedirectUri(request, siteUrl));
  dialog.searchParams.set("state", state);
  dialog.searchParams.set("response_type", "code");
  // The backend refuses accounts without an email, so ask for it up front.
  dialog.searchParams.set("scope", "email,public_profile");

  const response = NextResponse.redirect(dialog);
  setStateCookie(response, state, next);
  return response;
}
