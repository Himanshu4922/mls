"use client";

import { queryOptions } from "@tanstack/react-query";
import type { AuthUser } from "@/lib/types/domain";
import { fetchJson } from "@/lib/queries/fetcher";
import { qk } from "@/lib/queries/keys";

/**
 * Auth reads and writes. AuthProvider is the only consumer of these; the rest
 * of the app reads the user through `useAuth()`.
 */

/**
 * The signed-in user. `staleTime: Infinity` because it only changes on events
 * this app causes (sign-in, sign-out, phone verify, social redirect), each of
 * which writes the cache directly — polling it would add nothing.
 */
export const authMeQuery = queryOptions({
  queryKey: qk.auth.me,
  queryFn: async ({ signal }) => {
    const data = await fetchJson<{ user?: AuthUser | null }>("/api/auth/me", {
      signal,
      cache: "no-store",
    });
    return data?.user ?? null;
  },
  staleTime: Infinity,
  gcTime: Infinity,
});

export function loginRequest(input: { email: string; password: string }) {
  return fetchJson<{ user?: AuthUser | null }>("/api/auth/login", {
    method: "POST",
    body: input,
    fallback: "Sign in failed.",
  });
}

export function registerRequest(input: {
  name: string;
  email: string;
  password: string;
  phone: string;
}) {
  return fetchJson<{ detail?: string }>("/api/auth/register", {
    method: "POST",
    body: input,
    fallback: "Registration failed.",
  });
}

export function logoutRequest() {
  return fetchJson<unknown>("/api/auth/logout", { method: "POST" });
}

export function resendVerificationRequest(email: string) {
  return fetchJson<{ detail?: string }>("/api/auth/resend-verification", {
    method: "POST",
    body: { email },
    fallback: "Could not resend the verification email.",
  });
}

export function sendOtpRequest(phone: string) {
  return fetchJson<unknown>("/api/auth/otp", {
    method: "POST",
    body: { action: "send", phone },
  });
}

export function verifyOtpRequest(input: { phone: string; code: string }) {
  return fetchJson<unknown>("/api/auth/otp", {
    method: "POST",
    body: { action: "verify", ...input },
    fallback: "Invalid or expired code.",
  });
}

export function socialSignInRequest(body: {
  provider: "google" | "facebook";
  code?: string;
  id_token?: string;
  redirect_uri?: string;
}) {
  return fetchJson<{ user?: AuthUser | null }>("/api/auth/social", {
    method: "POST",
    body,
    fallback: "Sign-in failed. Please try again.",
  });
}
