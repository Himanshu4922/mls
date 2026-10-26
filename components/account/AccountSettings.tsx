"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useAuth } from "@/components/providers/AuthProvider";
import { AlertsPanel } from "@/components/watched/AlertsPanel";
import { Button } from "@/components/ui/Button";
import { Field, Input, TelInput } from "@/components/ui/Field";
import { EmptyState, PropertyGridSkeleton } from "@/components/ui/States";
import { updateProfileRequest } from "@/lib/queries/auth";
import { useWatchedOverview } from "@/lib/queries/watched";
import { qk } from "@/lib/queries/keys";
import { HttpError } from "@/lib/queries/fetcher";
import { validateEmail, validateName, validatePhone } from "@/lib/utils/validation";

/**
 * Signed-in account hub: profile fields + the same notification preferences
 * used on /watched?tab=alerts and the signup accordion.
 */
export function AccountSettings() {
  const { user, openAuth, setSignedInUser, signOut } = useAuth();
  const queryClient = useQueryClient();
  const overviewQuery = useWatchedOverview(Boolean(user));

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    phone?: string;
  }>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [formNotice, setFormNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setEmail(user.email);
    setPhone(user.phone ?? "");
  }, [user]);

  const saveProfile = useMutation({
    mutationFn: updateProfileRequest,
    onSuccess: async (data) => {
      setFormError(null);
      if (data.emailVerificationSent) {
        setFormNotice(
          data.detail ??
            "Check your new email for a verification link. You have been signed out until you verify.",
        );
        await signOut();
        return;
      }
      if (data.user) {
        setSignedInUser(data.user);
        queryClient.setQueryData(qk.auth.me, data.user);
      }
      setFormNotice("Profile saved.");
    },
    onError: (error) => {
      setFormNotice(null);
      setFormError(error instanceof HttpError ? error.message : "Could not save profile.");
    },
  });

  if (!user) {
    return (
      <EmptyState
        title="Sign in to manage your account"
        description="Update your profile and choose how you want to hear about homes you watch."
        action={{ label: "Sign in", onClick: () => openAuth("login") }}
      />
    );
  }

  function handleProfileSubmit(event: FormEvent) {
    event.preventDefault();
    const nextErrors = {
      name: validateName(name) ?? undefined,
      email: validateEmail(email) ?? undefined,
      phone: validatePhone(phone) ?? undefined,
    };
    setFieldErrors(nextErrors);
    if (nextErrors.name || nextErrors.email || nextErrors.phone) return;

    setFormNotice(null);
    setFormError(null);
    saveProfile.mutate({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
    });
  }

  const dirty =
    name.trim() !== user.name ||
    email.trim() !== user.email ||
    phone.trim() !== (user.phone ?? "");

  return (
    <div className="space-y-10">
      <section className="rounded-surface border border-line bg-surface p-5 sm:p-6">
        <h2 className="text-h3 text-ink">Profile</h2>
        <p className="mt-1 text-caption text-ink-muted">
          Your name and contact details on HomeAtlas.
        </p>

        <form onSubmit={handleProfileSubmit} className="mt-5 max-w-lg space-y-4" noValidate>
          <Field label="Full name" htmlFor="account-name" required error={fieldErrors.name}>
            <Input
              id="account-name"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={fieldErrors.name ? true : undefined}
            />
          </Field>

          <Field
            label="Email"
            htmlFor="account-email"
            required
            hint="Changing email signs you out until you verify the new address."
            error={fieldErrors.email}
          >
            <Input
              id="account-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-invalid={fieldErrors.email ? true : undefined}
            />
          </Field>

          <Field
            label="Phone"
            htmlFor="account-phone"
            required
            hint={
              user.phoneVerified
                ? "Verified. Changing it requires a new verification code."
                : "Not verified yet — you can verify from showing requests."
            }
            error={fieldErrors.phone}
          >
            <TelInput
              id="account-phone"
              name="phone"
              autoComplete="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              aria-invalid={fieldErrors.phone ? true : undefined}
            />
          </Field>

          {formError && (
            <p role="alert" className="text-caption text-negative">
              {formError}
            </p>
          )}
          {formNotice && (
            <p role="status" className="text-caption text-positive">
              {formNotice}
            </p>
          )}

          <Button
            type="submit"
            variant="primary"
            loading={saveProfile.isPending}
            disabled={!dirty || saveProfile.isPending}
          >
            Save profile
          </Button>
        </form>
      </section>

      <section>
        <div className="mb-4">
          <h2 className="text-h3 text-ink">Notification preferences</h2>
          <p className="mt-1 text-caption text-ink-muted">
            Same choices as when you created your account. You can also manage them under{" "}
            <Link href="/watched?tab=alerts" className="font-medium text-navy underline underline-offset-2">
              Saved homes → Alerts
            </Link>
            .
          </p>
        </div>

        {overviewQuery.isPending && !overviewQuery.data ? (
          <PropertyGridSkeleton count={1} />
        ) : (
          <AlertsPanel overview={overviewQuery.data ?? null} />
        )}
      </section>
    </div>
  );
}
