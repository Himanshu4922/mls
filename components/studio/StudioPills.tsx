import { cn } from "@/lib/utils/cn";

const PRECON_STATUS: Record<string, { label: string; tone: string }> = {
  publish: { label: "Published", tone: "text-positive" },
  draft: { label: "Draft", tone: "text-ink-muted" },
  private: { label: "Private", tone: "text-gold-deep" },
  archived: { label: "Archived", tone: "text-ink-subtle" },
  pending: { label: "Pending", tone: "text-gold-deep" },
};

const SUBMISSION_STATUS: Record<string, string> = {
  submitted: "text-gold-deep",
  under_review: "text-navy",
  needs_changes: "text-gold-deep",
  approved: "text-positive",
  rejected: "text-negative",
  withdrawn: "text-ink-subtle",
};

const PILL = "inline-flex items-center whitespace-nowrap text-caption font-medium";

export function PreconStatusPill({ status }: { status: string }) {
  const entry = PRECON_STATUS[status] ?? { label: status, tone: "text-ink-muted" };
  return <span className={cn(PILL, entry.tone)}>{entry.label}</span>;
}

/** Same vocabulary as pre-con publish statuses (draft / publish / private / …). */
export function ListingStatusPill({ status }: { status: string }) {
  return <PreconStatusPill status={status} />;
}

export function SubmissionStatusPill({ status, label }: { status: string; label: string }) {
  return <span className={cn(PILL, SUBMISSION_STATUS[status] ?? "text-ink-muted")}>{label}</span>;
}
