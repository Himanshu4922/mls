// Server-only: imports lib/auth/session, which depends on `next/headers`.
import { apiFetch } from "@/lib/api/client";
import { mapUser } from "@/lib/api/mappers";
import { setSessionCookies } from "@/lib/auth/session";
import type { BackendTokenPair, BackendUserProfile } from "@/lib/types/backend";
import type { AuthUser } from "@/lib/types/domain";

export type SocialProvider = "google" | "facebook";

/**
 * Exchanges a provider credential with mls-v2 and starts a session.
 *
 * Shared by `POST /api/auth/social` (Google popup) and the Facebook redirect
 * callback so both land the JWT pair in the same httpOnly cookies and resolve
 * the user through the same `mapUser` that `/api/auth/me` uses — the rest of the
 * app never learns which route signed someone in.
 *
 * Throws `ApiError` from the backend unchanged; callers decide whether that
 * becomes JSON or a redirect.
 */
export async function completeSocialSignIn(
  provider: SocialProvider,
  payload: Record<string, string | undefined>,
): Promise<AuthUser | null> {
  const tokens = await apiFetch<BackendTokenPair>(`/api/auth/${provider}/`, {
    method: "POST",
    body: payload,
  });

  await setSessionCookies(tokens);

  if (tokens.user) return mapUser(tokens.user);

  // The social views include the profile today; fall back in case that changes.
  try {
    const profile = await apiFetch<BackendUserProfile>("/api/auth/profile/", {
      token: tokens.access,
    });
    return mapUser(profile);
  } catch {
    return null;
  }
}
