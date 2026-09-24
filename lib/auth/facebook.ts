// Server-only: uses node:crypto. Route Handlers run on the Node.js runtime by
// default, which is all this is imported from.
import { randomBytes, timingSafeEqual } from "node:crypto";
import type { NextResponse } from "next/server";
import { AUTH_ERROR_PARAM, type AuthRedirectError } from "@/lib/auth/redirect-errors";

/**
 * Facebook Login — server-side authorization-code flow.
 *
 *   button → /api/auth/facebook/start → facebook.com dialog
 *          → /api/auth/facebook/callback → mls-v2 /api/auth/facebook/ → `next`
 *
 * A full-page redirect rather than the JS SDK popup: no third-party script, and
 * the code is exchanged server-side against an allowlisted redirect URI. The
 * cost is that in-memory state (a queued `openAuth` continuation) does not
 * survive the round trip; the user comes back signed in on the page they left.
 */

export const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "";
export const FACEBOOK_GRAPH_VERSION = (
  process.env.NEXT_PUBLIC_FACEBOOK_GRAPH_VERSION || "v19.0"
).replace(/^\/+/, "");

/** Short-lived cookie carrying the CSRF `state` and where to return to. */
export const STATE_COOKIE = "ha_fb_oauth";
const STATE_MAX_AGE = 60 * 10;
// Scoped to the callback so the value is not sent with every page request.
const STATE_COOKIE_PATH = "/api/auth/facebook";

/**
 * The public origin of the site. NEXT_PUBLIC_SITE_URL wins so the redirect URI
 * is stable behind proxies (where `request.url` may be an internal host); the
 * request origin is the fallback for local setups without it.
 */
export function siteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Malformed env — fall through to the request origin.
    }
  }
  return new URL(request.url).origin;
}

/**
 * Must be byte-identical in the dialog request, the token exchange and the
 * backend's FACEBOOK_ALLOWED_REDIRECT_URIS, so it is built in exactly one place.
 */
export function facebookRedirectUri(request: Request): string {
  return `${siteOrigin(request)}/api/auth/facebook/callback`;
}

/**
 * Accepts only a same-origin relative path. Anything else — absolute URLs,
 * protocol-relative `//evil.com`, `/\evil.com` (browsers read `\` as `/`) —
 * falls back to "/", so the callback cannot be turned into an open redirect.
 */
export function sanitizeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return "/";
  }
  // Control characters have no business in a path and can confuse parsers.
  if (/[\u0000-\u001f\u007f]/.test(value)) return "/";
  // Keep the auth-return path out of the API namespace (no redirect loops).
  if (value.startsWith("/api/")) return "/";
  return value;
}

/** Absolute URL for `next`, verified to stay on our origin after resolution. */
export function resolveNext(request: Request, next: string, error?: AuthRedirectError): URL {
  const origin = siteOrigin(request);
  let url = new URL(sanitizeNext(next), origin);
  if (url.origin !== origin) url = new URL("/", origin);
  if (error) url.searchParams.set(AUTH_ERROR_PARAM, error);
  else url.searchParams.delete(AUTH_ERROR_PARAM);
  return url;
}

export function createState(): string {
  return randomBytes(32).toString("hex");
}

/** Encodes `state` and `next` into one cookie value. */
export function setStateCookie(response: NextResponse, state: string, next: string) {
  response.cookies.set(STATE_COOKIE, `${state}.${encodeURIComponent(next)}`, {
    httpOnly: true,
    // Lax, not Strict: the callback is a top-level navigation FROM facebook.com,
    // and Strict would withhold the cookie on exactly that request.
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: STATE_COOKIE_PATH,
    maxAge: STATE_MAX_AGE,
  });
}

export function clearStateCookie(response: NextResponse) {
  response.cookies.set(STATE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: STATE_COOKIE_PATH,
    maxAge: 0,
  });
}

export function readStateCookie(value: string | undefined): { state: string; next: string } | null {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot <= 0) return null;
  let next: string;
  try {
    next = decodeURIComponent(value.slice(dot + 1));
  } catch {
    next = "/";
  }
  return { state: value.slice(0, dot), next: sanitizeNext(next) };
}

/** Constant-time comparison so the state check leaks nothing through timing. */
export function statesMatch(expected: string, received: string | null): boolean {
  if (!received) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(received);
  // timingSafeEqual throws on unequal lengths; a length mismatch is a mismatch.
  return a.length === b.length && timingSafeEqual(a, b);
}
