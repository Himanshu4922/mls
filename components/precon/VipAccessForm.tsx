"use client";

import { useState, type FormEvent } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { HttpError } from "@/lib/queries/fetcher";
import { useSubmitInquiry } from "@/lib/queries/inquiries";

/**
 * VIP preconstruction waitlist CTA (HomeAtlasUI PreconstructionPage).
 *
 * Posts to mls-v2 `inquiries/` with `is_vip_list` + `newsletter_opt_in` so the
 * lead lands in GHL tagged as precon VIP access (see inquiry_ghl).
 */
export function VipAccessForm() {
  const { user } = useAuth();
  const submit = useSubmitInquiry();
  const [email, setEmail] = useState(user?.email ?? "");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }

    const local = trimmed.split("@")[0] || "VIP";
    const firstName = user?.name?.trim().split(/\s+/)[0] || local;

    try {
      await submit.mutateAsync({
        first_name: firstName,
        last_name: user?.name?.trim().split(/\s+/).slice(1).join(" ") ?? "",
        email: trimmed,
        phone: user?.phone ?? "",
        intent: "buy",
        message: "VIP preconstruction access request.",
        preferred_locations: "",
        listing_key: "",
        page_url: typeof window !== "undefined" ? window.location.href : undefined,
        is_vip_list: true,
        newsletter_opt_in: true,
      });
      setDone(true);
    } catch (caught) {
      const message =
        caught instanceof HttpError
          ? (caught.fieldErrors.email ?? caught.message)
          : caught instanceof Error
            ? caught.message
            : "Could not join the VIP list.";
      setError(message);
    }
  }

  return (
    <section className="rounded-surface bg-ink px-6 py-10 text-center sm:px-12 sm:py-14">
      <p className="text-[11px] font-semibold tracking-[0.2em] text-gold">EXCLUSIVE ACCESS</p>
      <h2 className="mt-3 text-h2 text-white sm:text-h1">Get VIP Preconstruction Access</h2>
      <p className="mx-auto mt-3 max-w-md text-small text-white/70">
        Be the first to know about new releases, floor plan previews, and investor pricing before
        public launch.
      </p>

      {done ? (
        <p role="status" className="mx-auto mt-8 max-w-md text-small font-medium text-gold">
          You&apos;re on the list. We&apos;ll email you when new VIP releases open.
        </p>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="mx-auto mt-8 flex w-full max-w-md flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="vip-email" className="sr-only">
            Email address
          </label>
          <input
            id="vip-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="Your email address"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-12 min-w-0 flex-1 rounded-control border border-white/20 bg-white/10 px-4 text-small text-white outline-none transition-colors placeholder:text-white/40 focus:border-gold"
          />
          <Button
            type="submit"
            variant="accent"
            size="md"
            loading={submit.isPending}
            className="h-12 shrink-0 px-6 font-semibold whitespace-nowrap"
          >
            Join VIP List
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="mx-auto mt-3 max-w-md text-caption text-negative">
          {error}
        </p>
      )}
    </section>
  );
}
