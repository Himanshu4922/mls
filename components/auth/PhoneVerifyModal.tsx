"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Field, Select, TelInput } from "@/components/ui/Field";
import { OtpInput } from "@/components/ui/OtpInput";
import { useAuth } from "@/components/providers/AuthProvider";
import { sendOtpRequest, verifyOtpRequest } from "@/lib/queries/auth";
import { HttpError, NETWORK_ERROR_STATUS } from "@/lib/queries/fetcher";
import { DIAL_COUNTRIES, maskPhone, toE164 } from "@/lib/utils/phone";

/**
 * Phone verification by SMS code (mls-v2 `send-otp/` → `verify-otp/`, Twilio
 * Verify). Opened through `useAuth().verifyPhone()` — normally via
 * `usePhoneGate` — and mounted once per layout next to AuthModal.
 *
 * HomeAtlasUI has no OTP screen; this uses the AuthModal shell (Modal `sm`,
 * the same fields and banners) so it reads as part of the same sign-in family.
 * Flow ported from mls-v2/frontend PhoneVerificationModal.
 */

const RESEND_SECONDS = 30;

/** Status-specific copy; otherwise the route's own message. */
function otpErrorMessage(error: unknown): string {
  if (!(error instanceof HttpError) || error.status === NETWORK_ERROR_STATUS) {
    return "Network error. Please try again.";
  }
  if (error.status === 503) {
    return "Text verification is temporarily unavailable. Please try again later.";
  }
  if (error.status === 429) return "Too many attempts. Please wait a minute and try again.";
  return error.message || "Something went wrong. Please try again.";
}

type Step = "phone" | "code";

export function PhoneVerifyModal() {
  const { user, phoneDialogOpen, finishPhoneVerification, refresh } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [country, setCountry] = useState(DIAL_COUNTRIES[0].code);
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const sendOtp = useMutation({ mutationFn: sendOtpRequest });
  const verifyOtp = useMutation({ mutationFn: verifyOtpRequest });
  const busy = sendOtp.isPending || verifyOtp.isPending;
  const [cooldown, setCooldown] = useState(0);

  // Reset each time the dialog opens, prefilled with the account's number.
  const [wasOpen, setWasOpen] = useState(false);
  if (phoneDialogOpen !== wasOpen) {
    setWasOpen(phoneDialogOpen);
    if (phoneDialogOpen) {
      setStep("phone");
      setPhoneInput(user?.phone ?? "");
      setPhone(null);
      setCode("");
      setError(null);
    }
  }

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const dial = DIAL_COUNTRIES.find((item) => item.code === country)?.dial ?? "+1";

  async function sendCode(target: string) {
    setError(null);
    try {
      await sendOtp.mutateAsync(target);
    } catch (caught) {
      setError(otpErrorMessage(caught));
      return;
    }
    setPhone(target);
    setStep("code");
    setCode("");
    setCooldown(RESEND_SECONDS);
  }

  function onSubmitPhone(event: FormEvent) {
    event.preventDefault();
    const normalized = toE164(phoneInput, dial);
    if (!normalized) {
      setError("Enter a valid mobile number including the area code.");
      return;
    }
    void sendCode(normalized);
  }

  async function verify(value: string) {
    if (!phone || value.length !== 6 || busy) return;
    setError(null);
    try {
      await verifyOtp.mutateAsync({ phone, code: value });
    } catch (caught) {
      setError(otpErrorMessage(caught));
      setCode("");
      return;
    }
    // The route returns the raw (snake_case) backend profile, not an AuthUser,
    // so re-read /me through AuthProvider rather than writing it to the cache.
    const next = await refresh();
    finishPhoneVerification(Boolean(next?.phoneVerified ?? true));
  }

  return (
    <Modal
      open={phoneDialogOpen}
      onClose={() => finishPhoneVerification(false)}
      size="sm"
      title={step === "phone" ? "Verify your phone" : "Enter your code"}
      description={
        step === "phone"
          ? "We'll text you a 6-digit code. Verified buyers get floor plans and pricing instantly."
          : `We sent a code to ${phone ? maskPhone(phone) : "your phone"}.`
      }
    >
      {error && (
        <p
          role="alert"
          className="mb-4 rounded-control border border-negative/30 bg-negative-soft px-3.5 py-2.5 text-caption text-negative"
        >
          {error}
        </p>
      )}

      {step === "phone" ? (
        <form onSubmit={onSubmitPhone} className="space-y-4" noValidate>
          <div className="grid grid-cols-[7.5rem_1fr] gap-3">
            <Field label="Country" htmlFor="otp-country">
              <Select
                id="otp-country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
              >
                {DIAL_COUNTRIES.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.code} {item.dial}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Mobile number" htmlFor="otp-phone">
              <TelInput
                id="otp-phone"
                autoComplete="tel-national"
                placeholder="416 555 0123"
                value={phoneInput}
                onChange={(event) => setPhoneInput(event.target.value)}
                autoFocus
              />
            </Field>
          </div>
          <Button type="submit" variant="primary" block loading={busy}>
            Send code
          </Button>
          <p className="text-caption text-ink-muted">
            Standard message rates may apply. We only use your number to verify your account
            and to follow up on requests you make.
          </p>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void verify(code);
          }}
          className="space-y-4"
        >
          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={(value) => void verify(value)}
            disabled={busy}
            invalid={Boolean(error)}
          />
          <Button type="submit" variant="primary" block loading={busy} disabled={code.length !== 6}>
            Verify
          </Button>
          <div className="flex items-center justify-between text-caption">
            <button
              type="button"
              className="font-medium text-navy hover:text-gold"
              onClick={() => {
                setStep("phone");
                setError(null);
              }}
            >
              Change number
            </button>
            <button
              type="button"
              disabled={cooldown > 0 || busy}
              className="font-medium text-navy hover:text-gold disabled:text-ink-subtle"
              onClick={() => phone && void sendCode(phone)}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
