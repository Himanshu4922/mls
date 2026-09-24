import type { Metadata } from "next";
import { apiFetch, ApiError } from "@/lib/api/client";
import { setSessionCookies } from "@/lib/auth/session";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Badge";
import type { BackendTokenPair } from "@/lib/types/backend";

export const metadata: Metadata = {
  title: "Verify your email",
  robots: { index: false },
};

// The token is single-use; never cache the result.
export const dynamic = "force-dynamic";

type Outcome = "verified" | "expired" | "invalid" | "error";

/**
 * Landing page for the verification link sent at registration.
 *
 * mls-v2 `verify-email/<uuid>/` activates the account and returns a JWT pair, so
 * a successful visit signs the user straight in. It answers 410 for an expired
 * token and 404 for one already used — we distinguish those, because the
 * recovery differs (request a new link vs. just sign in).
 */
export default async function VerifyEmailPage({
  params,
}: PageProps<"/verify-email/[token]">) {
  const { token } = await params;
  let outcome: Outcome = "error";

  try {
    const tokens = await apiFetch<BackendTokenPair>(
      `/api/auth/verify-email/${encodeURIComponent(token)}/`,
    );
    if (tokens?.access) {
      await setSessionCookies(tokens);
    }
    outcome = "verified";
  } catch (error) {
    if (error instanceof ApiError) {
      if (error.status === 410) outcome = "expired";
      else if (error.status === 404) outcome = "invalid";
    }
  }

  const copy: Record<Outcome, { eyebrow: string; title: string; body: string }> = {
    verified: {
      eyebrow: "Welcome",
      title: "Your email is verified",
      body: "You're signed in and ready to save homes, follow areas and set up alerts.",
    },
    expired: {
      eyebrow: "Link expired",
      title: "That link has expired",
      body: "Verification links are valid for 24 hours. Sign in to have a new one sent.",
    },
    invalid: {
      eyebrow: "Already used",
      title: "This link is no longer valid",
      body: "It may have already been used. Try signing in — your account is likely active.",
    },
    error: {
      eyebrow: "Something went wrong",
      title: "We couldn't verify your email",
      body: "The verification service isn't responding. Please try the link again shortly.",
    },
  };

  const { eyebrow, title, body } = copy[outcome];

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-3 max-w-xl text-h1 text-ink">{title}</h1>
      <p className="mt-3 max-w-md text-body text-ink-muted">{body}</p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <LinkButton href="/listings" variant="primary">
          Browse listings
        </LinkButton>
        <LinkButton href="/" variant="secondary">
          Back to home
        </LinkButton>
      </div>
    </div>
  );
}
