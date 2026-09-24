// Server-only by construction: `next/headers` throws if imported into a Client
// Component, so no `server-only` package dependency is needed here.
import { cookies } from "next/headers";
import { cache } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { mapUser } from "@/lib/api/mappers";
import type { BackendTokenPair, BackendUserProfile } from "@/lib/types/backend";
import type { AuthUser } from "@/lib/types/domain";

/**
 * Session handling.
 *
 * Tokens live in httpOnly cookies rather than localStorage, so page scripts
 * cannot read them and Server Components can resolve the user during render.
 */

export const ACCESS_COOKIE = "ha_access";
export const REFRESH_COOKIE = "ha_refresh";

// SimpleJWT defaults: 5 min access, 1 day refresh. Cookie lifetimes are generous
// on the refresh side and short on access; the proxy refreshes on demand.
const ACCESS_MAX_AGE = 60 * 30;
const REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

/**
 * Cookies are writable only in a Server Action or Route Handler. A Server
 * Component render — the root layout resolving the user, a Studio page gating
 * access — throws on any write.
 *
 * That matters because a refresh is triggered lazily by whoever notices the
 * access token has expired, and that is usually a render. The refreshed token
 * is still returned and used for the current request, so the page renders
 * correctly; only its persistence is skipped, and the next Route Handler call
 * (the `/api/auth/me` the client fires, or any `/api/*` proxy) performs the
 * same refresh in a context that CAN write, so the new cookie lands there.
 *
 * Swallowing is therefore correct rather than lossy — but it is deliberately
 * narrow: only the known "read-only cookies during render" failure is ignored,
 * and anything else is rethrown.
 */
function isReadonlyCookieError(error: unknown): boolean {
  return (
    error instanceof Error &&
    /can only be modified in a Server Action or Route Handler/i.test(error.message)
  );
}

export async function setSessionCookies(tokens: BackendTokenPair) {
  const store = await cookies();
  try {
    store.set(ACCESS_COOKIE, tokens.access, { ...COOKIE_OPTIONS, maxAge: ACCESS_MAX_AGE });
    if (tokens.refresh) {
      store.set(REFRESH_COOKIE, tokens.refresh, {
        ...COOKIE_OPTIONS,
        maxAge: REFRESH_MAX_AGE,
      });
    }
  } catch (error) {
    if (!isReadonlyCookieError(error)) throw error;
  }
}

export async function clearSessionCookies() {
  const store = await cookies();
  try {
    store.delete(ACCESS_COOKIE);
    store.delete(REFRESH_COOKIE);
  } catch (error) {
    if (!isReadonlyCookieError(error)) throw error;
  }
}

export async function getAccessToken(): Promise<string | null> {
  // A token minted earlier in this same request wins: during a render its
  // cookie could not be written, so the cookie may still hold the expired one.
  const fresh = requestToken().value;
  if (fresh) return fresh;
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

/**
 * Access token minted during THIS request, keyed by the refresh token it came
 * from. `cache` is per-request, so nothing leaks between users or requests.
 *
 * This exists because a refresh during a Server Component render cannot persist
 * its cookie (see above), so a later `getAccessToken()` in the same render would
 * re-read the old, expired value. Anything that refreshes writes the result
 * here, and reads prefer it over the cookie.
 */
const requestToken = cache((): { value: string | null } => ({ value: null }));

/** Exchanges the refresh token for a new access token. Returns null on failure. */
export async function refreshAccessToken(): Promise<string | null> {
  const refresh = await getRefreshToken();
  if (!refresh) return null;
  try {
    const tokens = await apiFetch<BackendTokenPair>("/api/auth/token/refresh/", {
      method: "POST",
      body: { refresh },
    });
    await setSessionCookies({ ...tokens, refresh: tokens.refresh || refresh });
    requestToken().value = tokens.access;
    return tokens.access;
  } catch {
    await clearSessionCookies();
    requestToken().value = null;
    return null;
  }
}

/**
 * Resolves the signed-in user, refreshing once if the access token has expired.
 * Returns null when signed out — callers render the public view, never an error.
 */
/**
 * Memoised per request: the root layout and pages that prefetch per-user data
 * (lib/queries/server.ts) both ask for the user, and apiFetch's abort signal
 * stops Next's fetch dedupe from collapsing the two profile requests.
 */
export const getCurrentUser = cache(loadCurrentUser);

async function loadCurrentUser(): Promise<AuthUser | null> {
  let token = await getAccessToken();
  if (!token) {
    token = await refreshAccessToken();
    if (!token) return null;
  }

  try {
    const profile = await apiFetch<BackendUserProfile>("/api/auth/profile/", { token });
    return mapUser(profile);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) return null;
      try {
        const profile = await apiFetch<BackendUserProfile>("/api/auth/profile/", {
          token: refreshed,
        });
        return mapUser(profile);
      } catch {
        return null;
      }
    }
    return null;
  }
}

/** Access token for authenticated server-side calls, refreshing if needed. */
export async function requireAccessToken(): Promise<string | null> {
  return (await getAccessToken()) ?? (await refreshAccessToken());
}

/**
 * Resolves the current user AND their access token together, for Studio routes.
 *
 * `getCurrentUser()` and `requireAccessToken()` called separately used to be
 * able to disagree: the first may silently refresh, and during a render that
 * refresh cannot persist its cookie, so the second re-read the replaced token.
 * The per-request token memo above keeps them in step; this pairing makes the
 * "both come from one resolution" guarantee explicit at the call site.
 *
 * Returns null when nobody is signed in; the caller decides what that means.
 */
export async function getStudioSession(): Promise<
  { user: AuthUser; token: string } | null
> {
  const user = await getCurrentUser();
  if (!user) return null;
  // getCurrentUser() has just refreshed if it needed to, so this is current.
  const token = await requireAccessToken();
  if (!token) return null;
  return { user, token };
}

/**
 * The Studio authorization gate. THIS is the security boundary — never a
 * client-side check.
 *
 * Returns null for "not allowed" without distinguishing signed-out from
 * not-permitted, so callers render a 404 and the area's existence is not
 * advertised to people who cannot use it.
 */
export async function requireStudioAccess(): Promise<
  { user: AuthUser; token: string } | null
> {
  const session = await getStudioSession();
  if (!session) return null;
  return session.user.canUseStudio ? session : null;
}
