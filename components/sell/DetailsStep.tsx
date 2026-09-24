"use client";

import { Field, Input, NumericInput, Select } from "@/components/ui/Field";
import { OptionCardGroup, type OptionCardItem } from "@/components/ui/OptionCard";
import type { SubmissionPurpose, SubmitterType } from "@/lib/api/listingSubmissions";
import {
  controlProps,
  PROPERTY_TYPES,
  SUBMITTER_TYPES,
  type StepProps,
} from "@/components/sell/form";

const PURPOSE_OPTIONS: Array<OptionCardItem<SubmissionPurpose>> = [
  {
    value: "sale",
    title: "For sale",
    description: "A home you want to sell.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    value: "rent",
    title: "For rent",
    description: "A home or unit to lease.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="8" cy="15" r="4" stroke="currentColor" strokeWidth="1.6" />
        <path d="m11 12 9-9m-3 3 2 2m-5 1 2 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    value: "assignment",
    title: "Assignment",
    description: "A pre-construction contract, before closing.",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
        <path d="M14 3v5h5M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    ),
  },
];

/** Step 1 — what is being listed and where. */
export function DetailsStep({ form, errors, set }: StepProps) {
  const assignment = form.purpose === "assignment";

  return (
    <div className="space-y-6">
      <div>
        <OptionCardGroup
          name="purpose"
          label="What are you listing?"
          options={PURPOSE_OPTIONS}
          value={form.purpose}
          onChange={(value) => set("purpose", value)}
        />
        {errors.purpose && (
          <p className="mt-1.5 text-caption text-negative" role="alert">
            {errors.purpose}
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="You are" htmlFor={controlProps("submitter_type", errors).id} required error={errors.submitter_type}>
          <Select
            {...controlProps("submitter_type", errors)}
            value={form.submitter_type}
            onChange={(event) => set("submitter_type", event.target.value as SubmitterType)}
          >
            {SUBMITTER_TYPES.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Property type" htmlFor={controlProps("property_type", errors).id} required error={errors.property_type}>
          <Select
            {...controlProps("property_type", errors)}
            value={form.property_type}
            onChange={(event) => set("property_type", event.target.value)}
          >
            <option value="" disabled>
              Choose a type
            </option>
            {PROPERTY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Street address"
          htmlFor={controlProps("address_line_1", errors).id}
          required
          error={errors.address_line_1}
          className="md:col-span-2"
        >
          <Input
            {...controlProps("address_line_1", errors)}
            value={form.address_line_1}
            onChange={(event) => set("address_line_1", event.target.value)}
            autoComplete="address-line1"
            placeholder="123 Main Street"
            maxLength={255}
          />
        </Field>
        <Field label="Unit / suite" htmlFor={controlProps("address_line_2", errors).id} error={errors.address_line_2}>
          <Input
            {...controlProps("address_line_2", errors)}
            value={form.address_line_2}
            onChange={(event) => set("address_line_2", event.target.value)}
            autoComplete="address-line2"
            placeholder="Unit 1204"
            maxLength={255}
          />
        </Field>
        <Field label="City" htmlFor={controlProps("city", errors).id} required error={errors.city}>
          <Input
            {...controlProps("city", errors)}
            value={form.city}
            onChange={(event) => set("city", event.target.value)}
            autoComplete="address-level2"
            placeholder="Toronto"
            maxLength={120}
          />
        </Field>
        <Field
          label="Postal code"
          htmlFor={controlProps("postal_code", errors).id}
          error={errors.postal_code}
          hint="Full code, e.g. L7A 3K9."
        >
          <Input
            {...controlProps("postal_code", errors)}
            value={form.postal_code}
            onChange={(event) => set("postal_code", event.target.value.toUpperCase())}
            autoComplete="postal-code"
            placeholder="L7A 3K9"
            maxLength={7}
          />
        </Field>
        <Field label="Interior area (sq ft)" htmlFor={controlProps("interior_area_sqft", errors).id} error={errors.interior_area_sqft}>
          <NumericInput
            {...controlProps("interior_area_sqft", errors)}
            value={form.interior_area_sqft}
            onChange={(event) => set("interior_area_sqft", event.target.value)}
            min={0}
            max={100000}
          />
        </Field>
        <Field label="Bedrooms" htmlFor={controlProps("bedrooms", errors).id} error={errors.bedrooms}>
          <NumericInput
            {...controlProps("bedrooms", errors)}
            decimals={1}
            value={form.bedrooms}
            onChange={(event) => set("bedrooms", event.target.value)}
            min={0}
            max={99}
          />
        </Field>
        <Field label="Bathrooms" htmlFor={controlProps("bathrooms", errors).id} error={errors.bathrooms}>
          <NumericInput
            {...controlProps("bathrooms", errors)}
            decimals={1}
            value={form.bathrooms}
            onChange={(event) => set("bathrooms", event.target.value)}
            min={0}
            max={99}
          />
        </Field>
      </div>

      {assignment && <AssignmentFields form={form} errors={errors} set={set} />}
    </div>
  );
}

/** Pre-construction contract details — required by the backend for assignments. */
function AssignmentFields({ form, errors, set }: StepProps) {
  const money = (
    key: "original_purchase_price" | "deposit_paid" | "assignment_fee",
    label: string,
    required = false,
    hint?: string,
  ) => (
    <Field label={label} htmlFor={controlProps(key, errors).id} required={required} error={errors[key]} hint={hint}>
      <NumericInput
        {...controlProps(key, errors)}
        decimals={2}
        value={form[key]}
        onChange={(event) => set(key, event.target.value)}
        placeholder="$"
      />
    </Field>
  );

  return (
    <fieldset className="rounded-surface border border-line bg-surface-alt p-5">
      <legend className="px-1 text-small font-semibold text-ink">Assignment details</legend>
      <p className="mb-4 text-caption text-ink-muted">
        Purchase price, deposit and fee are shared with our review team only — they are never
        shown publicly.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Project name" htmlFor={controlProps("project_name", errors).id} required error={errors.project_name}>
          <Input
            {...controlProps("project_name", errors)}
            value={form.project_name}
            onChange={(event) => set("project_name", event.target.value)}
            placeholder="e.g. The Pinnacle Condos"
            maxLength={200}
          />
        </Field>
        <Field label="Builder" htmlFor={controlProps("builder_name", errors).id} required error={errors.builder_name}>
          <Input
            {...controlProps("builder_name", errors)}
            value={form.builder_name}
            onChange={(event) => set("builder_name", event.target.value)}
            maxLength={200}
          />
        </Field>
        <Field label="Expected occupancy" htmlFor={controlProps("occupancy_date", errors).id} required error={errors.occupancy_date}>
          <Input
            {...controlProps("occupancy_date", errors)}
            type="date"
            value={form.occupancy_date}
            onChange={(event) => set("occupancy_date", event.target.value)}
          />
        </Field>
        {money("original_purchase_price", "Original purchase price", true)}
        {money("deposit_paid", "Deposit paid to date")}
        {money("assignment_fee", "Assignment fee", false, "The builder's fee to approve the transfer, if known.")}
      </div>
    </fieldset>
  );
}
