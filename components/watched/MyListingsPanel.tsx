"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import {
  canWithdraw,
  isEditable,
  type ListingSubmission,
  type SubmissionStatus,
} from "@/lib/api/listingSubmissions";
import { formatDate, formatLeasePrice, formatPrice, toNumber } from "@/lib/utils/format";
import { submissionsApi } from "@/components/sell/submissionClient";
import { useUserKeys } from "@/components/providers/AuthProvider";
import { useMySubmissions } from "@/lib/queries/submissions";

const STATUS_TONES: Record<SubmissionStatus, BadgeTone> = {
  draft: "neutral",
  submitted: "navy",
  under_review: "navy",
  needs_changes: "warm",
  approved: "positive",
  rejected: "negative",
  withdrawn: "neutral",
};

/**
 * "My listings" tab: the signed-in user's own submissions with their review
 * status. Self-contained (fetches its own data, no props) so the /watched page
 * can mount it as a tab without wiring.
 */
export function MyListingsPanel() {
  const queryClient = useQueryClient();
  const query = useMySubmissions();
  const keys = useUserKeys();
  const [confirming, setConfirming] = useState<ListingSubmission | null>(null);

  const withdraw = useMutation({
    mutationFn: (id: number) => submissionsApi.withdraw(id),
    onSuccess: (updated) => {
      // Patch the row in place, then revalidate in the background.
      if (keys) {
        queryClient.setQueryData<ListingSubmission[]>(keys.submissions, (current) =>
          current?.map((item) => (item.id === updated.id ? updated : item)),
        );
        queryClient.setQueryData(keys.submission(updated.id), updated);
        void queryClient.invalidateQueries({ queryKey: keys.submissions });
      }
      setConfirming(null);
    },
  });

  if (query.isPending) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading your listings">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-surface" />
        ))}
      </div>
    );
  }

  if (query.isError) {
    return (
      <ErrorState
        title="We couldn't load your listings"
        description={query.error.message}
        onRetry={() => void query.refetch()}
      />
    );
  }

  if (query.data.length === 0) {
    return (
      <EmptyState
        title="No listings yet"
        description="List a home for sale or rent, or a pre-construction assignment. Our team reviews every submission before it goes live."
        action={{ label: "List your property", href: "/sell/list" }}
      />
    );
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-small text-ink-muted">
          {query.data.length} {query.data.length === 1 ? "submission" : "submissions"}
        </p>
        <LinkButton href="/sell/list" variant="secondary" size="sm">
          New listing
        </LinkButton>
      </div>

      <ul className="space-y-3">
        {query.data.map((submission) => (
          <SubmissionRow
            key={submission.id}
            submission={submission}
            onWithdraw={() => {
              withdraw.reset();
              setConfirming(submission);
            }}
          />
        ))}
      </ul>

      <Modal
        open={confirming !== null}
        onClose={() => setConfirming(null)}
        title="Withdraw this listing?"
        description={
          confirming
            ? `${confirming.address_line_1}, ${confirming.city}`
            : undefined
        }
        size="sm"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setConfirming(null)} disabled={withdraw.isPending}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={withdraw.isPending}
              onClick={() => confirming && withdraw.mutate(confirming.id)}
            >
              Withdraw
            </Button>
          </div>
        }
      >
        <p className="text-small text-ink-muted">
          {confirming?.status === "approved"
            ? "It will be taken off the site."
            : "It will be removed from our review queue."}{" "}
          This can&rsquo;t be undone — you would need to submit it again as a new listing.
        </p>
        {withdraw.isError && (
          <p role="alert" className="mt-3 rounded-control bg-negative-soft px-3 py-2 text-small text-negative">
            {withdraw.error.message}
          </p>
        )}
      </Modal>
    </>
  );
}

function SubmissionRow({
  submission,
  onWithdraw,
}: {
  submission: ListingSubmission;
  onWithdraw: () => void;
}) {
  const price = toNumber(submission.asking_price);
  const photo = submission.media.find((media) => media.media_type === "photo")?.file_url;
  const editable = isEditable(submission.status);

  return (
    <li className="flex flex-col gap-4 rounded-surface border border-line bg-surface p-4 sm:flex-row sm:items-start">
      <div className="h-20 w-full shrink-0 overflow-hidden rounded-control bg-surface-alt sm:w-28">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- storage URLs vary (Cloudinary / local)
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-ink-subtle" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={STATUS_TONES[submission.status]}>{submission.status_label}</Badge>
          <span className="text-caption font-medium text-ink-muted">{submission.purpose_label}</span>
        </div>
        <p className="mt-1.5 truncate text-small font-semibold text-ink">
          {submission.purpose === "assignment" && submission.project_name
            ? `${submission.project_name} · `
            : ""}
          {submission.address_line_1}
          {submission.address_line_2 ? `, ${submission.address_line_2}` : ""}
        </p>
        <p className="text-caption text-ink-muted">
          {submission.city}
          {price !== null
            ? ` · ${submission.purpose === "rent" ? formatLeasePrice(price) : formatPrice(price)}`
            : ""}
          {` · updated ${formatDate(submission.updated_at)}`}
        </p>
        {submission.status === "needs_changes" && submission.review_note && (
          <p className="mt-2 whitespace-pre-line rounded-control bg-gold-soft px-3 py-2 text-caption text-ink">
            <span className="font-semibold">Requested changes: </span>
            {submission.review_note}
          </p>
        )}
      </div>

      <div className="flex shrink-0 gap-2 sm:flex-col sm:items-stretch">
        {editable && (
          <LinkButton href={`/sell/list?id=${submission.id}`} variant="primary" size="sm">
            Continue editing
          </LinkButton>
        )}
        {canWithdraw(submission.status) && (
          <Button variant="ghost" size="sm" onClick={onWithdraw}>
            Withdraw
          </Button>
        )}
      </div>
    </li>
  );
}
