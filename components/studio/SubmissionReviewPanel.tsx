"use client";

import { useEffect, useId, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import {
  DECISION_LABELS,
  NOTE_REQUIRED,
  type ReviewDecision,
  type ReviewSubmission,
  type StudioPreconSummary,
} from "@/lib/api/studioAdmin";
import { searchStudioPrecon, useDecideSubmission, useLinkSubmissionPrecon } from "@/lib/queries/studioAdmin";

const DECISION_VARIANT: Record<ReviewDecision, "primary" | "secondary" | "danger"> = {
  approved: "primary",
  under_review: "secondary",
  needs_changes: "secondary",
  rejected: "danger",
};
// Most useful first.
const ORDER: ReviewDecision[] = ["approved", "needs_changes", "under_review", "rejected"];

/** Decision buttons, the note to the submitter, and the pre-con project link. */
export function SubmissionReviewPanel({ submission }: { submission: ReviewSubmission }) {
  const id = useId();
  const decide = useDecideSubmission(submission.id);
  const [note, setNote] = useState(submission.reviewNote);
  const [notify, setNotify] = useState(true);
  const [result, setResult] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);

  async function apply(decision: ReviewDecision) {
    setResult(null);
    setNoteError(null);
    if (NOTE_REQUIRED.has(decision) && !note.trim()) {
      setNoteError("Tell the submitter what to change or why it was declined.");
      return;
    }
    try {
      const updated = await decide.mutateAsync({ status: decision, review_note: note.trim(), notify });
      setResult(
        `Marked ${updated.statusLabel.toLowerCase()}.` +
          (notify ? (updated.emailed ? ` ${submission.contactEmail} was emailed.` : " The email could not be sent.") : ""),
      );
    } catch {
      // Rendered from decide.error.
    }
  }

  const decisions = ORDER.filter((d) => submission.allowedDecisions.includes(d));

  return (
    <div className="space-y-6">
      {submission.purpose === "assignment" && <PreconLink submission={submission} />}

      <section className="space-y-4 rounded-surface border border-line bg-surface p-5">
        <h2 className="text-h3 text-ink">Decision</h2>
        {decisions.length === 0 ? (
          <p className="text-small text-ink-muted">No review actions are available for a {submission.statusLabel.toLowerCase()} submission.</p>
        ) : (
          <>
            <Field
              label="Note to the submitter"
              htmlFor={`${id}-note`}
              hint="Required when requesting changes or rejecting. Included in the email."
              error={noteError}
            >
              <Textarea id={`${id}-note`} value={note} onChange={(e) => setNote(e.target.value)} maxLength={4000} className="min-h-24" />
            </Field>
            <label className="flex items-center gap-2 text-small text-ink">
              <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} className="h-4 w-4 accent-navy" />
              Email the submitter
            </label>
            <div className="flex flex-col gap-2">
              {decisions.map((decision) => (
                <Button
                  key={decision}
                  variant={DECISION_VARIANT[decision]}
                  size="sm"
                  block
                  onClick={() => void apply(decision)}
                  loading={decide.isPending && decide.variables?.status === decision}
                  disabled={decide.isPending}
                >
                  {submission.status === "approved" && decision === "rejected" ? "Unpublish (reject)" : DECISION_LABELS[decision]}
                </Button>
              ))}
            </div>
          </>
        )}
        <div aria-live="polite">
          {decide.error && (
            <p role="alert" className="text-caption text-negative">
              {decide.error.message}
            </p>
          )}
          {result && <p className="text-caption text-positive">{result}</p>}
        </div>
      </section>
    </div>
  );
}

function PreconLink({ submission }: { submission: ReviewSubmission }) {
  const id = useId();
  const link = useLinkSubmissionPrecon(submission.id);
  const [query, setQuery] = useState(submission.projectName);
  const [options, setOptions] = useState<StudioPreconSummary[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Debounced project search; the latest keystroke wins.
  useEffect(() => {
    const term = query.trim();
    // Short queries show nothing (see `visible`), so there is nothing to fetch.
    if (term.length < 2) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setSearching(true);
      setSearchError(null);
      try {
        const items = await searchStudioPrecon(term);
        if (!cancelled) setOptions(items);
      } catch (error) {
        if (!cancelled) setSearchError(error instanceof Error ? error.message : "Search failed.");
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  const visible = query.trim().length >= 2 ? options : [];

  return (
    <section className="space-y-3 rounded-surface border border-line bg-surface p-5">
      <div>
        <h2 className="text-h3 text-ink">Pre-con project</h2>
        <p className="mt-1 text-caption text-ink-muted">
          Linking shows this assignment on the project&apos;s page and uses the project for similar listings.
        </p>
      </div>
      {submission.preconId ? (
        <div className="flex items-center justify-between gap-3 rounded-control bg-surface-alt px-3 py-2">
          <span className="min-w-0 truncate text-small font-medium text-ink">{submission.preconTitle ?? `Project #${submission.preconId}`}</span>
          <Button size="sm" variant="ghost" onClick={() => link.mutate(null)} loading={link.isPending}>
            Unlink
          </Button>
        </div>
      ) : (
        <p className="text-small text-gold-deep">Not linked yet.</p>
      )}
      <Field label="Find a project" htmlFor={`${id}-search`} hint={`Submitted as “${submission.projectName || "—"}” by ${submission.builderName || "unknown builder"}.`}>
        <Input id={`${id}-search`} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Project name or ID" />
      </Field>
      {searching && <p className="text-caption text-ink-muted">Searching…</p>}
      {searchError && <p className="text-caption text-negative">{searchError}</p>}
      {visible.length > 0 && (
        <ul className="max-h-60 divide-y divide-line overflow-y-auto rounded-control border border-line">
          {visible.map((option) => (
            <li key={option.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-small text-ink">{option.title}</p>
                <p className="truncate text-caption text-ink-subtle">
                  #{option.id}
                  {option.developer ? ` · ${option.developer}` : ""}
                  {option.status !== "publish" ? ` · ${option.status}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => link.mutate(option.id)}
                disabled={link.isPending || option.id === submission.preconId}
              >
                {option.id === submission.preconId ? "Linked" : "Link"}
              </Button>
            </li>
          ))}
        </ul>
      )}
      {link.error && (
        <p role="alert" className="text-caption text-negative">
          {link.error.message}
        </p>
      )}
    </section>
  );
}
