import { NextResponse, type NextRequest } from "next/server";
import { ApiError } from "@/lib/api/client";
import {
  STATE_COOKIE,
  clearStateCookie,
  facebookRedirectUri,
  readStateCookie,
  resolveNext,
  statesMatch,
} from "@/lib/auth/facebook";
import type { AuthRedirectError } from "@/lib/auth/redirect-errors";
import { completeSocialSignIn } from "@/lib/auth/social";

/**
 * GET /api/auth/facebook/callback — Facebook redirects here after the dialog.
 *
 * Verifies `state` against the cookie set by /start, exchanges the code through
 * mls-v2 (which holds the app secret), stores the session cookies, and returns
 * the visitor to where they started. Every outcome is a redirect: failures come
 * back as `?auth_error=<code>`, which the AuthModal turns into a message.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const saved = readStateCookie(request.cookies.get(STATE_COOKIE)?.value);
  const next = saved?.next ?? "/";

  const finish = (error?: AuthRedirectError) => {
    const response = NextResponse.redirect(resolveNext(request, next, error));
    // One-shot: a replayed callback URL must fail the state check.
    clearStateCookie(response);
    return response;
  };

  // A missing or mismatched state is either an expired attempt or a forged
  // callback. Either way nothing is exchanged.
  if (!saved || !statesMatch(saved.state, params.get("state"))) {
    return finish("facebook");
  }

  // Facebook sends ?error=access_denied&error_reason=user_denied on "Not now".
  if (params.get("error")) {
    return finish(params.get("error") === "access_denied" ? "facebook_cancelled" : "facebook");
  }

  const code = params.get("code");
  if (!code) return finish("facebook");

  try {
    // Session cookies are written through next/headers inside this call; Next
    // merges them into the redirect response returned below.
    await completeSocialSignIn("facebook", {
      code,
      redirect_uri: facebookRedirectUri(request),
    });
    return finish();
  } catch (error) {
    // The backend's only user-actionable failure is a declined email scope
    // (400 "Facebook did not return an email..."); everything else is generic.
    if (error instanceof ApiError && error.status === 400 && /email/i.test(error.message)) {
      return finish("facebook_email");
    }
    if (process.env.NODE_ENV !== "production") {
      console.warn("[auth] facebook callback failed:", error instanceof Error ? error.message : error);
    }
    return finish("facebook");
  }
}
