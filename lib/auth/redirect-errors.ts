/**
 * Errors from redirect-based sign-in (Facebook) reach the page as
 * `?auth_error=<code>`, because the failure happens in a Route Handler that can
 * only answer with a redirect. Client-safe: no server imports.
 */
export const AUTH_ERROR_PARAM = "auth_error";

export const AUTH_REDIRECT_ERRORS = {
  facebook: "Facebook sign-in didn't work. Please try again or use another method.",
  facebook_cancelled: "Facebook sign-in was cancelled.",
  facebook_email:
    "Facebook didn't share your email address. Allow email access and try again, or sign up with email.",
} as const;

export type AuthRedirectError = keyof typeof AUTH_REDIRECT_ERRORS;

export function authRedirectErrorMessage(code: string | null): string | null {
  if (!code || !Object.hasOwn(AUTH_REDIRECT_ERRORS, code)) return null;
  return AUTH_REDIRECT_ERRORS[code as AuthRedirectError];
}
