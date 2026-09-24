"use client";

import { useId, useState, type FormEvent } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { HttpError } from "@/lib/queries/fetcher";
import { useSubscribeNewsletter } from "@/lib/queries/home";

/**
 * Daily-updates subscribe box → mls-v2 `POST /api/home/newsletter/subscribe/`.
 *
 * Guests can subscribe; a signed-in visitor's session is attached so the
 * subscription links to the account. CASL requires express consent, so the
 * box must be ticked and `consent: true` is only ever sent alongside that tick.
 * The backend emails a confirmation carrying the one-click unsubscribe link.
 */
export function NewsletterForm() {
  const { user } = useAuth();
  const subscribe = useSubscribeNewsletter();
  const consentId = useId();
  const [email, setEmail] = useState(user?.email ?? "");
  const [consent, setConsent] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent) {
      setError("Please confirm you agree to receive emails.");
      return;
    }
    setError(null);

    try {
      await subscribe.mutateAsync({ email: email.trim(), source: "homepage" });
      setDone(true);
    } catch (caught) {
      const message =
        caught instanceof HttpError
          ? (caught.fieldErrors.email ?? caught.message)
          : "Could not subscribe you.";
      setError(message);
    }
  }

  if (done) {
    return (
      <p role="status" className="text-small font-medium text-positive">
        Check your inbox — we&apos;ve sent a confirmation with an unsubscribe link.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full sm:w-auto">
      <div className="flex w-full gap-3 sm:w-auto">
        <label htmlFor={`${consentId}-email`} className="sr-only">
          Email address
        </label>
        <Input
          id={`${consentId}-email`}
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="your@email.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full sm:w-55"
        />
        <Button type="submit" variant="dark" loading={subscribe.isPending}>
          Subscribe
        </Button>
      </div>
      <label htmlFor={consentId} className="mt-3 flex max-w-sm cursor-pointer items-start gap-2">
        <input
          id={consentId}
          type="checkbox"
          required
          checked={consent}
          onChange={(event) => setConsent(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-navy"
        />
        <span className="text-caption text-ink-muted">
          I agree to receive emails from HomeAtlas with market news and updates. I can
          unsubscribe anytime.
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-2 text-caption text-negative">
          {error}
        </p>
      )}
    </form>
  );
}
