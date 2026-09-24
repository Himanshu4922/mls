"use client";

import { useRef, useState } from "react";
import { useUserKeys } from "@/components/providers/AuthProvider";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/Button";
import { Stepper } from "@/components/ui/Stepper";
import type { ListingSubmission } from "@/lib/api/listingSubmissions";
import {
  emptyForm,
  fieldId,
  formFromSubmission,
  payloadFor,
  STEP_LABELS,
  stepOfField,
  validateStep,
  type FieldErrors,
  type FieldKey,
  type ListingForm,
} from "@/components/sell/form";
import { DetailsStep } from "@/components/sell/DetailsStep";
import { PricingStep } from "@/components/sell/PricingStep";
import { PhotosStep } from "@/components/sell/PhotosStep";
import { ListingSuccess } from "@/components/sell/ListingSuccess";
import { useMediaQueue } from "@/components/sell/useMediaQueue";
import {
  SubmissionRequestError,
  submissionsApi,
} from "@/components/sell/submissionClient";

const STEP_COPY = [
  { title: "Property details", body: "What you're listing and where it is." },
  { title: "Pricing & contact", body: "Your price, and how our review team can reach you." },
  { title: "Photos & submit", body: "Add photos or floor plans, then send it for review." },
];

/**
 * The three-step form. Structure follows ValuationWizard: one <form> per step,
 * Back (secondary) + Next (primary, flex-1, loading), a role=alert banner.
 *
 * Each Next saves: step 1 creates the draft (or PATCHes a resumed one), step 2
 * PATCHes, step 3 uploads queued media, saves the declarations and submits. So
 * closing the tab mid-way leaves a draft the user can resume.
 *
 * Mounted with `key` = the submission id, so state initialises from props once.
 */
export function ListingWizardForm({ initial }: { initial: ListingSubmission | null }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const keys = useUserKeys();
  const topRef = useRef<HTMLDivElement>(null);
  const queue = useMediaQueue();

  const [submission, setSubmission] = useState<ListingSubmission | null>(initial);
  const [form, setForm] = useState<ListingForm>(() =>
    initial ? formFromSubmission(initial, user) : emptyForm(user),
  );
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<ListingSubmission | null>(null);

  function set<K extends FieldKey>(key: K, value: ListingForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
  }

  function goTo(next: number) {
    setStep(next);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function focusFirst(fieldErrors: FieldErrors) {
    const first = Object.keys(fieldErrors).find((key) => fieldErrors[key]);
    if (!first) return;
    // Wait a frame so a step switch has rendered the input.
    requestAnimationFrame(() => document.getElementById(fieldId(first as FieldKey))?.focus());
  }

  function refreshMine() {
    if (keys) void queryClient.invalidateQueries({ queryKey: keys.submissions });
  }

  /** Spreads server field errors onto inputs, stepping back to the earliest one. */
  function applyError(error: unknown) {
    if (!(error instanceof SubmissionRequestError)) {
      setBanner("Something went wrong. Please try again.");
      return;
    }
    const fieldErrors = error.fieldErrors;
    const keys = Object.keys(fieldErrors);
    const steps = keys.map(stepOfField).filter((value): value is number => value !== null);
    if (steps.length === 0) {
      // Nothing to pin to an input — show whatever the server said.
      setBanner(keys.length ? (fieldErrors[keys[0]] ?? error.message) : error.message);
      return;
    }
    const earliest = Math.min(...steps);
    setErrors(fieldErrors);
    setBanner(error.message);
    if (earliest !== step) goTo(earliest);
    focusFirst(fieldErrors);
  }

  async function save(forStep: number): Promise<ListingSubmission | null> {
    // No draft yet (e.g. creation failed on a contact field and we jumped ahead):
    // create with the details too, since the backend requires them up front.
    const payload = submission
      ? payloadFor(forStep, form)
      : { ...payloadFor(0, form), ...payloadFor(forStep, form) };
    try {
      const saved = submission
        ? await submissionsApi.update(submission.id, payload)
        : await submissionsApi.create(payload);
      setSubmission(saved);
      refreshMine();
      return saved;
    } catch (error) {
      applyError(error);
      return null;
    }
  }

  async function handleNext(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);
    const stepErrors = validateStep(step, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusFirst(stepErrors);
      return;
    }
    setBusy(true);
    const saved = await save(step);
    setBusy(false);
    if (saved) goTo(step + 1);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);
    const stepErrors = validateStep(2, form);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusFirst(stepErrors);
      return;
    }
    if (!submission) {
      goTo(0);
      return;
    }

    setBusy(true);
    try {
      const uploaded = await queue.uploadAll(submission.id, submission.media.length);
      if (!uploaded) {
        setBanner("Some files didn't upload. Remove them or press Submit again to retry.");
        return;
      }
      const saved = await save(2);
      if (!saved) return;
      const submitted = await submissionsApi.submit(saved.id);
      refreshMine();
      setDone(submitted);
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) {
      applyError(error);
    } finally {
      setBusy(false);
    }
  }

  if (done) return <ListingSuccess submission={done} />;

  const copy = STEP_COPY[step];
  const last = step === STEP_LABELS.length - 1;

  return (
    <div ref={topRef} className="scroll-mt-28">
      <Stepper className="mb-6" steps={STEP_LABELS} current={step} />

      {submission?.status === "needs_changes" && submission.review_note && (
        <div className="mb-4 rounded-control border border-gold bg-gold-soft px-4 py-3 text-small text-ink">
          <p className="font-semibold">Changes requested by our review team</p>
          <p className="mt-1 whitespace-pre-line text-ink-soft">{submission.review_note}</p>
        </div>
      )}

      {banner && (
        <p role="alert" className="mb-4 rounded-control bg-negative-soft px-4 py-3 text-small text-negative">
          {banner}
        </p>
      )}

      <form
        noValidate
        onSubmit={last ? handleSubmit : handleNext}
        className="space-y-6 rounded-surface border border-line bg-surface p-6 shadow-card md:p-8"
      >
        <div>
          <h2 className="text-h2 text-ink">{copy.title}</h2>
          <p className="mt-1 text-small text-ink-muted">{copy.body}</p>
        </div>

        {step === 0 && <DetailsStep form={form} errors={errors} set={set} />}
        {step === 1 && <PricingStep form={form} errors={errors} set={set} />}
        {step === 2 && (
          <PhotosStep
            form={form}
            errors={errors}
            set={set}
            queue={queue}
            existing={submission?.media ?? []}
            uploading={busy}
          />
        )}

        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="secondary" onClick={() => goTo(step - 1)} disabled={busy}>
              Back
            </Button>
          )}
          <Button type="submit" variant="primary" className="flex-1" loading={busy}>
            {last ? "Submit for review" : "Save & continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
