"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Input, PasswordInput, TelInput } from "@/components/ui/Field";
import { OrDivider } from "@/components/ui/SectionCard";
import { Tabs } from "@/components/ui/Tabs";
import { HAS_SOCIAL_PROVIDERS, SocialButtons } from "@/components/auth/SocialButtons";
import { useAuth, type AuthMode } from "@/components/providers/AuthProvider";
import { AUTH_ERROR_PARAM, authRedirectErrorMessage } from "@/lib/auth/redirect-errors";
import { resendVerificationRequest } from "@/lib/queries/auth";
import { HttpError, NETWORK_ERROR_STATUS } from "@/lib/queries/fetcher";
import { cn } from "@/lib/utils/cn";
import {
  PASSWORD_MIN_LENGTH,
  passwordStrength,
  validateEmail,
  validateName,
  validateNewPassword,
  validatePasswordPresence,
  validatePhone,
  type PasswordStrength,
} from "@/lib/utils/validation";

/**
 * Sign in / register dialog.
 *
 * Mirrors HomeAtlasUI's AuthModal visually, wired to mls-v2 `/api/auth/`.
 * Two behaviours the reference could not have, because it had no backend:
 *  - registration ends in a "check your email" state (the API returns no tokens
 *    and the account stays inactive until the emailed link is opened)
 *  - a 403 on sign-in means "email not verified", so we offer to resend.
 *
 * Google / Facebook sit above the email form in both modes (SocialButtons).
 * Facebook is a full-page redirect, so its failures arrive as `?auth_error=` on
 * the page it returns to; this modal picks that up on mount and reopens itself
 * with the message.
 *
 * Validation runs client-side first (see lib/utils/validation.ts, which mirrors
 * the backend's rules) so a typo costs nothing. Fields validate on blur and clear
 * as soon as the user starts fixing them — never on every keystroke, which would
 * shout at someone halfway through typing a valid address.
 */

type FieldName = "name" | "email" | "phone" | "password";
type Errors = Partial<Record<FieldName, string>>;

const EMPTY_FORM = { name: "", email: "", phone: "", password: "" };

const MODE_TABS: Array<{ id: AuthMode; label: string }> = [
  { id: "signup", label: "Sign up" },
  { id: "login", label: "Log in" },
];

export function AuthModal() {
  const { authDialog, openAuth, closeAuth, signIn, signUp, pending } = useAuth();
  const [mode, setMode] = useState<AuthMode>(authDialog.mode);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const resend = useMutation({ mutationFn: resendVerificationRequest });

  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  // A redirect-flow error waiting for the dialog to open; the reset below would
  // otherwise wipe it in the same render that opens the dialog.
  const [redirectError, setRedirectError] = useState(readRedirectError);

  const isSignup = mode === "signup";

  // Reset transient state whenever the dialog opens or the caller switches mode.
  // Compared during render rather than in an effect so the form never paints a
  // stale error for a frame.
  const session = `${authDialog.open}:${authDialog.mode}`;
  const [lastSession, setLastSession] = useState(session);
  if (session !== lastSession) {
    setLastSession(session);
    if (authDialog.open) {
      setMode(authDialog.mode);
      setError(redirectError);
      setRedirectError(null);
      setNotice(null);
      setUnverifiedEmail(null);
      setSent(false);
      setValues(EMPTY_FORM);
      setErrors({});
      setTouched({});
    }
  }

  // Opens the dialog for a redirect error picked up on load (see
  // readRedirectError), and strips the param so a reload or a shared link does
  // not replay it.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has(AUTH_ERROR_PARAM)) {
      url.searchParams.delete(AUTH_ERROR_PARAM);
      window.history.replaceState(window.history.state, "", url);
    }
    if (redirectError) openAuth("login");
  }, [redirectError, openAuth]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
    setUnverifiedEmail(null);
    // Password rules differ between modes, so a stale error would be misleading.
    setErrors({});
    setTouched({});
    setValues((prev) => ({ ...prev, password: "" }));
  };

  /** Validates one field against the rules for the current mode. */
  function fieldError(name: FieldName, form = values): string | null {
    switch (name) {
      case "email":
        return validateEmail(form.email);
      case "password":
        return isSignup
          ? validateNewPassword(form.password, {
              email: form.email,
              name: form.name,
            })
          : validatePasswordPresence(form.password);
      case "name":
        return isSignup ? validateName(form.name) : null;
      case "phone":
        return isSignup ? validatePhone(form.phone) : null;
    }
  }

  function handleChange(name: FieldName, value: string) {
    const next = { ...values, [name]: value };
    setValues(next);

    // Only clear an existing error as it becomes valid; do not raise new ones
    // mid-keystroke.
    if (errors[name] && !fieldError(name, next)) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function handleBlur(name: FieldName) {
    setTouched((prev) => ({ ...prev, [name]: true }));
    const message = fieldError(name);
    setErrors((prev) => ({ ...prev, [name]: message ?? undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const names: FieldName[] = isSignup
      ? ["name", "email", "phone", "password"]
      : ["email", "password"];

    const found: Errors = {};
    for (const name of names) {
      const message = fieldError(name);
      if (message) found[name] = message;
    }

    if (Object.keys(found).length > 0) {
      setErrors(found);
      setTouched(Object.fromEntries(names.map((n) => [n, true])));
      // Move focus to the first problem so keyboard and screen-reader users are
      // not left guessing why submit did nothing.
      document.getElementById(`auth-${names.find((n) => found[n])}`)?.focus();
      return;
    }

    setError(null);
    setNotice(null);
    setUnverifiedEmail(null);

    const email = values.email.trim();

    if (!isSignup) {
      const result = await signIn(email, values.password);
      if (!result.ok) {
        setError(result.error ?? "Sign in failed.");
        if (result.needsVerification) setUnverifiedEmail(email);
      }
      return;
    }

    const result = await signUp({
      name: values.name.trim(),
      email,
      password: values.password,
      phone: values.phone.trim(),
    });

    if (!result.ok) {
      setError(result.error ?? "Registration failed.");
      return;
    }
    setNotice(
      result.detail ??
        "Account created. Check your email for a verification link to finish signing up.",
    );
  }

  async function resendVerification() {
    if (!unverifiedEmail || resend.isPending) return;
    try {
      const body = await resend.mutateAsync(unverifiedEmail);
      setSent(true);
      setNotice(body?.detail ?? "Verification email sent.");
      setError(null);
    } catch (caught) {
      setError(
        caught instanceof HttpError && caught.status !== NETWORK_ERROR_STATUS
          ? caught.message
          : "Network error. Please try again.",
      );
    }
  }

  const shown = (name: FieldName) => (touched[name] ? errors[name] : undefined);

  return (
    <Modal
      open={authDialog.open}
      onClose={closeAuth}
      size="sm"
      title={isSignup ? "Create your account" : "Welcome back"}
      description={
        isSignup
          ? "Save homes, track prices and get alerts on new listings."
          : "Sign in to see your saved homes and alerts."
      }
    >
      {/* Success state replaces the form — there is nothing left to submit. */}
      {notice && !error ? (
        <div className="space-y-4">
          <div className="rounded-control border border-positive/30 bg-positive-soft px-4 py-3">
            <p className="text-small text-positive">{notice}</p>
          </div>
          <Button variant="secondary" block onClick={closeAuth}>
            Close
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          <Tabs
            items={MODE_TABS}
            value={mode}
            onChange={(next) => {
              if (next !== mode) switchMode(next);
            }}
            variant="segmented"
            label="Sign up or log in"
            className="flex w-full *:flex-1"
          />

          {error && (
            <div role="alert" className="rounded-control border border-negative/30 bg-negative-soft px-4 py-3">
              <p className="text-small text-negative">{error}</p>
              {unverifiedEmail && !sent && (
                <button
                  type="button"
                  onClick={resendVerification}
                  className="mt-1.5 text-caption font-semibold text-navy underline"
                >
                  Resend verification email
                </button>
              )}
            </div>
          )}

          {HAS_SOCIAL_PROVIDERS && (
            <>
              <SocialButtons
                disabled={pending}
                onStart={() => {
                  setError(null);
                  setUnverifiedEmail(null);
                }}
                onError={(message) => {
                  setUnverifiedEmail(null);
                  setError(message);
                }}
              />
              <OrDivider />
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {isSignup && (
              <Field
                label="Full name"
                htmlFor="auth-name"
                required
                error={shown("name")}
              >
                <Input
                  id="auth-name"
                  name="name"
                  autoComplete="name"
                  placeholder="Jordan Patel"
                  value={values.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  onBlur={() => handleBlur("name")}
                  aria-invalid={shown("name") ? true : undefined}
                  aria-describedby={shown("name") ? "auth-name-error" : undefined}
                />
              </Field>
            )}

            <Field label="Email" htmlFor="auth-email" required error={shown("email")}>
              <Input
                id="auth-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={values.email}
                onChange={(event) => handleChange("email", event.target.value)}
                onBlur={() => handleBlur("email")}
                aria-invalid={shown("email") ? true : undefined}
                aria-describedby={shown("email") ? "auth-email-error" : undefined}
              />
            </Field>

            {isSignup && (
              <Field
                label="Phone"
                htmlFor="auth-phone"
                required
                hint="Used for showing requests and listing alerts."
                error={shown("phone")}
              >
                <TelInput
                  id="auth-phone"
                  name="phone"
                  autoComplete="tel"
                  placeholder="(416) 555-0134"
                  value={values.phone}
                  onChange={(event) => handleChange("phone", event.target.value)}
                  onBlur={() => handleBlur("phone")}
                  aria-invalid={shown("phone") ? true : undefined}
                  aria-describedby={shown("phone") ? "auth-phone-error" : undefined}
                />
              </Field>
            )}

            <Field
              label="Password"
              htmlFor="auth-password"
              required
              hint={
                isSignup && !shown("password")
                  ? `At least ${PASSWORD_MIN_LENGTH} characters.`
                  : undefined
              }
              error={shown("password")}
            >
              <PasswordInput
                id="auth-password"
                name="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={values.password}
                onChange={(event) => handleChange("password", event.target.value)}
                onBlur={() => handleBlur("password")}
                aria-invalid={shown("password") ? true : undefined}
                aria-describedby={shown("password") ? "auth-password-error" : undefined}
              />
            </Field>

            {isSignup && values.password.length > 0 && !shown("password") && (
              <StrengthMeter strength={passwordStrength(values.password)} />
            )}

            <Button type="submit" variant="primary" block loading={pending}>
              {isSignup ? "Create account" : "Sign in"}
            </Button>
          </form>
        </div>
      )}
    </Modal>
  );
}

/*
 * Facebook sign-in fails server-side, in a Route Handler that can only
 * redirect, so the reason arrives as `?auth_error=`. Read from window.location
 * rather than useSearchParams: this modal is mounted in layouts, and that hook
 * would opt every static page under them into client rendering up to a Suspense
 * boundary (and fail the build without one).
 *
 * Used as a lazy state initializer. The server returns null and the client may
 * return a message, which is safe for hydration because the dialog renders
 * nothing until it is opened.
 */
function readRedirectError(): string | null {
  if (typeof window === "undefined") return null;
  return authRedirectErrorMessage(new URLSearchParams(window.location.search).get(AUTH_ERROR_PARAM));
}

const STRENGTH_META: Record<
  PasswordStrength,
  { label: string; bars: number; bar: string; text: string }
> = {
  weak: { label: "Weak", bars: 1, bar: "bg-negative", text: "text-negative" },
  fair: { label: "Fair", bars: 2, bar: "bg-gold", text: "text-ink-muted" },
  strong: { label: "Strong", bars: 3, bar: "bg-positive", text: "text-positive" },
};

/** Advisory only — the backend is the authority on whether a password is accepted. */
function StrengthMeter({ strength }: { strength: PasswordStrength }) {
  const meta = STRENGTH_META[strength];
  return (
    <div className="-mt-1 flex items-center gap-2">
      <div className="flex flex-1 gap-1" aria-hidden="true">
        {[0, 1, 2].map((index) => (
          <span
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              index < meta.bars ? meta.bar : "bg-line",
            )}
          />
        ))}
      </div>
      <span className={cn("text-caption font-medium", meta.text)}>
        Password strength: {meta.label}
      </span>
    </div>
  );
}
