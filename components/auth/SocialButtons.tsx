"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { Spinner } from "@/components/ui/Button";
import { useAuth } from "@/components/providers/AuthProvider";
import { socialSignInRequest } from "@/lib/queries/auth";
import { HttpError, NETWORK_ERROR_STATUS } from "@/lib/queries/fetcher";
import { cn } from "@/lib/utils/cn";

/**
 * "Continue with Google / Facebook" (HomeAtlasUI AuthModal SocialButtons,
 * L338-380).
 *
 * - Google uses the GSI popup code flow: the popup returns an auth code, which
 *   /api/auth/social exchanges through mls-v2 (redirect_uri "postmessage"). The
 *   modal stays open, so a queued `openAuth` continuation runs on success.
 * - Facebook is a full-page redirect through /api/auth/facebook/start; the user
 *   comes back signed in on the same page, but in-memory continuations are lost.
 *
 * Each provider hides itself when its public id is not configured, so a
 * half-set-up environment never shows a button that can only fail.
 */

// Read at module level so Next inlines them into the client bundle.
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";
const FACEBOOK_APP_ID = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID ?? "";

export const HAS_SOCIAL_PROVIDERS = Boolean(GOOGLE_CLIENT_ID || FACEBOOK_APP_ID);

// Minimal slice of the GSI client we use; typed here to avoid a types package.
interface GoogleCodeResponse {
  code?: string;
  error?: string;
  error_description?: string;
}
interface GoogleCodeClient {
  requestCode: () => void;
}
interface GoogleOAuth2 {
  initCodeClient: (config: {
    client_id: string;
    scope: string;
    ux_mode: "popup" | "redirect";
    callback: (response: GoogleCodeResponse) => void;
    error_callback?: (error: { type: string; message?: string }) => void;
  }) => GoogleCodeClient;
}
type GoogleWindow = Window & { google?: { accounts?: { oauth2?: GoogleOAuth2 } } };

const GSI_SRC = "https://accounts.google.com/gsi/client";
let gsiPromise: Promise<GoogleOAuth2> | null = null;

/** Injects the GSI script once per page and resolves with its oauth2 API. */
function loadGsi(): Promise<GoogleOAuth2> {
  const existing = (window as GoogleWindow).google?.accounts?.oauth2;
  if (existing) return Promise.resolve(existing);
  if (gsiPromise) return gsiPromise;

  gsiPromise = new Promise<GoogleOAuth2>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GSI_SRC;
    script.async = true;
    script.onload = () => {
      const api = (window as GoogleWindow).google?.accounts?.oauth2;
      if (api) resolve(api);
      else reject(new Error("GSI loaded without oauth2"));
    };
    script.onerror = () => reject(new Error("GSI failed to load"));
    document.head.appendChild(script);
  }).catch((error) => {
    // Let a later click retry (e.g. after an ad blocker is paused).
    gsiPromise = null;
    throw error;
  });
  return gsiPromise;
}

type Provider = "google" | "facebook";

export function SocialButtons({
  onError,
  onStart,
  disabled,
}: {
  /** Shown in the modal's error banner. */
  onError: (message: string) => void;
  /** Clears any stale banner as a new attempt begins. */
  onStart?: () => void;
  disabled?: boolean;
}) {
  const { setSignedInUser } = useAuth();
  const [busy, setBusy] = useState<Provider | null>(null);
  // `busy` still drives the spinner: it spans the popup as well as this request.
  const socialSignIn = useMutation({ mutationFn: socialSignInRequest });

  // Warm the script as soon as the dialog opens: requestCode() must run close to
  // the click for the popup to count as user-initiated, so loading on click risks
  // the browser blocking it on a slow connection.
  useEffect(() => {
    if (GOOGLE_CLIENT_ID) loadGsi().catch(() => {});
  }, []);

  // Backing out of the Facebook dialog can restore this page from the bfcache
  // with the button still spinning; un-stick it.
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setBusy(null);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  if (!HAS_SOCIAL_PROVIDERS) return null;

  async function exchangeGoogleCode(code: string) {
    const failed = "Google sign-in failed. Please try again.";
    try {
      const data = await socialSignIn.mutateAsync({ provider: "google", code });
      if (!data?.user) {
        onError(failed);
        return;
      }
      // Closes the dialog and releases any queued continuation.
      setSignedInUser(data.user);
    } catch (error) {
      if (!(error instanceof HttpError) || error.status === NETWORK_ERROR_STATUS) {
        onError("Network error. Please try again.");
        return;
      }
      // The route's own message when it sent one; otherwise the Google copy.
      const serverError = (error.payload as { error?: unknown } | null)?.error;
      onError(typeof serverError === "string" && serverError ? serverError : failed);
    } finally {
      setBusy(null);
    }
  }

  async function signInWithGoogle() {
    onStart?.();
    setBusy("google");
    let oauth2: GoogleOAuth2;
    try {
      oauth2 = await loadGsi();
    } catch {
      setBusy(null);
      onError("Couldn't load Google sign-in. Check your connection or ad blocker and try again.");
      return;
    }

    try {
      oauth2
        .initCodeClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "openid email profile",
          ux_mode: "popup",
          callback: (response) => {
            if (response.error || !response.code) {
              setBusy(null);
              onError(
                response.error === "access_denied"
                  ? "Google sign-in was cancelled."
                  : "Google sign-in failed. Please try again.",
              );
              return;
            }
            void exchangeGoogleCode(response.code);
          },
          // Fires when the popup never opened or was closed before finishing —
          // without it the button would spin forever.
          error_callback: (error) => {
            setBusy(null);
            onError(
              error.type === "popup_failed_to_open"
                ? "Your browser blocked the Google sign-in window. Allow pop-ups and try again."
                : error.type === "popup_closed"
                  ? "The Google sign-in window was closed before it finished."
                  : "Google sign-in failed. Please try again.",
            );
          },
        })
        .requestCode();
    } catch {
      setBusy(null);
      onError("Unable to start Google sign-in. Please try again.");
    }
  }

  function signInWithFacebook() {
    onStart?.();
    setBusy("facebook");
    // Read from window rather than useSearchParams: this component lives in a
    // layout, where that hook would force a Suspense boundary around the modal.
    const here = `${window.location.pathname}${window.location.search}`;
    // A full document navigation on purpose: the target is a Route Handler that
    // redirects to facebook.com, which router.push (an RSC fetch) cannot follow.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(`/api/auth/facebook/start?next=${encodeURIComponent(here)}`);
  }

  const locked = disabled || busy !== null;

  return (
    <div className="space-y-3">
      {GOOGLE_CLIENT_ID && (
        <SocialButton
          onClick={signInWithGoogle}
          loading={busy === "google"}
          disabled={locked}
          icon={<GoogleMark />}
        >
          Continue with Google
        </SocialButton>
      )}
      {FACEBOOK_APP_ID && (
        <SocialButton
          onClick={signInWithFacebook}
          loading={busy === "facebook"}
          disabled={locked}
          icon={<FacebookMark />}
        >
          Continue with Facebook
        </SocialButton>
      )}
    </div>
  );
}

function SocialButton({
  onClick,
  loading,
  disabled,
  icon,
  children,
}: {
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={loading || undefined}
      className={cn(
        "flex h-11 w-full items-center justify-center gap-3 rounded-control border border-line bg-surface",
        "text-small font-medium text-ink transition-colors",
        "hover:border-navy/40 hover:bg-surface-alt disabled:pointer-events-none disabled:opacity-60",
      )}
    >
      {/* The spinner takes the mark's slot so the label does not shift. */}
      {loading ? <Spinner className="h-[18px] w-[18px] text-ink-muted" /> : icon}
      {children}
    </button>
  );
}

/** Brand mark: Google's four colours are part of the logo, not our palette. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}

/** Brand mark: Facebook blue is part of the logo, not our palette. */
function FacebookMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true" className="shrink-0">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}
