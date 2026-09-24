"use client";

import { Field, Input, NumericInput, TelInput, Textarea } from "@/components/ui/Field";
import { controlProps, type StepProps } from "@/components/sell/form";

/** Step 2 — price, availability, description and who reviewers should contact. */
export function PricingStep({ form, errors, set }: StepProps) {
  const rent = form.purpose === "rent";

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2">
        <Field
          label={rent ? "Monthly rent" : "Asking price"}
          htmlFor={controlProps("asking_price", errors).id}
          required
          error={errors.asking_price}
          hint={form.purpose === "assignment" ? "What you're asking the buyer to pay for the unit." : undefined}
        >
          <NumericInput
            {...controlProps("asking_price", errors)}
            decimals={2}
            value={form.asking_price}
            onChange={(event) => set("asking_price", event.target.value)}
            placeholder="$"
          />
        </Field>
        <Field
          label={rent ? "Available from" : "Available / possession date"}
          htmlFor={controlProps("available_from", errors).id}
          error={errors.available_from}
        >
          <Input
            {...controlProps("available_from", errors)}
            type="date"
            value={form.available_from}
            onChange={(event) => set("available_from", event.target.value)}
          />
        </Field>
        <Field
          label="Description"
          htmlFor={controlProps("description", errors).id}
          error={errors.description}
          hint="Layout, upgrades, parking, what makes it stand out."
          className="md:col-span-2"
        >
          <Textarea
            {...controlProps("description", errors)}
            value={form.description}
            onChange={(event) => set("description", event.target.value)}
            rows={5}
            maxLength={5000}
          />
        </Field>
      </div>

      <div>
        <h3 className="text-h3 text-ink">Contact for our review team</h3>
        <p className="mt-1 text-caption text-ink-muted">
          Kept private — buyers and tenants reach you through HomeAtlas, never directly.
        </p>
        <div className="mt-4 grid gap-5 md:grid-cols-2">
          <Field label="Full name" htmlFor={controlProps("contact_name", errors).id} required error={errors.contact_name}>
            <Input
              {...controlProps("contact_name", errors)}
              value={form.contact_name}
              onChange={(event) => set("contact_name", event.target.value)}
              autoComplete="name"
              maxLength={255}
            />
          </Field>
          <Field label="Email" htmlFor={controlProps("contact_email", errors).id} required error={errors.contact_email}>
            <Input
              {...controlProps("contact_email", errors)}
              type="email"
              value={form.contact_email}
              onChange={(event) => set("contact_email", event.target.value)}
              autoComplete="email"
            />
          </Field>
          <Field label="Phone" htmlFor={controlProps("contact_phone", errors).id} required error={errors.contact_phone}>
            <TelInput
              {...controlProps("contact_phone", errors)}
              value={form.contact_phone}
              onChange={(event) => set("contact_phone", event.target.value)}
              autoComplete="tel"
              maxLength={30}
            />
          </Field>
        </div>
      </div>
    </div>
  );
}
