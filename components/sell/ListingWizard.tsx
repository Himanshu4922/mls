"use client";

import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button, LinkButton } from "@/components/ui/Button";
import { ErrorState, Skeleton } from "@/components/ui/States";
import { usePhoneGate } from "@/lib/hooks/usePhoneGate";
import { isEditable, type ListingSubmission } from "@/lib/api/listingSubmissions";
import { formatDate } from "@/lib/utils/format";
import { useMySubmissions, useSubmission } from "@/lib/queries/submissions";
import { ListingWizardForm } from "@/components/sell/ListingWizardForm";

/**
 * List-your-property entry point.
 *
 * 1. Gate: the backend refuses to submit without a verified phone, so the
 *    wizard only opens behind usePhoneGate. A verified user skips the intro.
 * 2. Resolve what to edit: `?id=` (from My listings → Continue editing), else
 *    offer to resume the newest draft rather than silently starting a second.
 * 3. Hand off to ListingWizardForm, keyed by submission id so it initialises
 *    its state from the chosen record exactly once.
 */
export function ListingWizard({ submissionId }: { submissionId: number | null }) {
  const { user } = useAuth();
  const { gate, verified } = usePhoneGate();
  const [started, setStarted] = useState(false);
  const active = Boolean(user) && (started || verified);

  if (!active) {
    return (
      <IntroCard
        signedIn={Boolean(user)}
        onStart={() => gate(() => setStarted(true))}
      />
    );
  }

  return submissionId ? (
    <ResumeById id={submissionId} />
  ) : (
    <ResumeLatest />
  );
}

function IntroCard({ signedIn, onStart }: { signedIn: boolean; onStart: () => void }) {
  return (
    <div className="rounded-surface border border-line bg-surface p-6 text-center shadow-card md:p-8">
      <h2 className="text-h2 text-ink">List your property or assignment</h2>
      <p className="mx-auto mt-2 max-w-md text-small text-ink-muted">
        It takes about five minutes. You&rsquo;ll need the address, your price and a few photos.
        {signedIn
          ? " We'll confirm your phone number first so buyers' inquiries reach a real person."
          : " Sign in and confirm your phone number to get started."}
      </p>
      <Button variant="primary" size="lg" className="mt-6" onClick={onStart}>
        Get started
      </Button>
    </div>
  );
}

function LoadingCard() {
  return (
    <div className="space-y-4 rounded-surface border border-line bg-surface p-6" role="status" aria-label="Loading">
      <Skeleton className="h-7 w-full" />
      <Skeleton className="h-6 w-1/2" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

function ResumeById({ id }: { id: number }) {
  const query = useSubmission(id);

  if (query.isPending) return <LoadingCard />;
  if (query.isError) {
    return (
      <ErrorState
        title="We couldn't open that listing"
        description={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  }
  if (!isEditable(query.data.status)) {
    return (
      <div className="rounded-surface border border-line bg-surface p-6 text-center">
        <h2 className="text-h3 text-ink">This listing can no longer be edited</h2>
        <p className="mt-2 text-small text-ink-muted">
          It is {query.data.status_label.toLowerCase()}. Our team will be in touch if anything
          changes.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <LinkButton href="/watched?tab=listings" variant="secondary">
            My listings
          </LinkButton>
          <LinkButton href="/sell/list" variant="primary">
            Start a new listing
          </LinkButton>
        </div>
      </div>
    );
  }
  return <ListingWizardForm key={query.data.id} initial={query.data} />;
}

function ResumeLatest() {
  const [choice, setChoice] = useState<"ask" | "resume" | "new">("ask");
  const query = useMySubmissions();

  /*
   * Freeze the draft decision on the first result. The form invalidates this
   * query on every save, and a live `latest` would flip a fresh wizard into the
   * "continue your draft?" prompt right after it created that draft.
   * (Adjusting state during render — React's pattern for derived-once state.)
   */
  const [resolved, setResolved] = useState(false);
  const [latest, setLatest] = useState<ListingSubmission | null>(null);
  if (!resolved && !query.isPending) {
    // A failed lookup shouldn't block listing — just start fresh.
    const drafts = (query.data ?? []).filter((s) => isEditable(s.status));
    setLatest(drafts[0] ?? null);
    setResolved(true);
  }
  if (!resolved) return <LoadingCard />;

  if (latest && choice === "ask") {
    return (
      <div className="rounded-surface border border-line bg-surface p-6 shadow-card md:p-8">
        <h2 className="text-h2 text-ink">
          {latest.status === "needs_changes" ? "A listing needs your changes" : "Continue your draft?"}
        </h2>
        <p className="mt-2 text-small text-ink-muted">
          {latest.purpose_label} · {latest.address_line_1}
          {latest.city ? `, ${latest.city}` : ""} · last saved {formatDate(latest.updated_at)}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="primary" className="flex-1" onClick={() => setChoice("resume")}>
            Continue your draft
          </Button>
          <Button variant="secondary" onClick={() => setChoice("new")}>
            Start new
          </Button>
        </div>
      </div>
    );
  }

  const initial = choice === "resume" ? latest : null;
  return <ListingWizardForm key={initial?.id ?? "new"} initial={initial} />;
}
