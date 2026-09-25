import { cn } from "@/lib/utils/cn";

const PRECON_STATUS: Record<string, { label: string; tone: string }> = {
  publish: { label: "Published", tone: "bg-positive-soft text-positive" },
  draft: { label: "Draft", tone: "bg-surface-alt text-ink-muted" },
  private: { label: "Private", tone: "bg-gold-soft text-ink" },
  archived: { label: "Archived", tone: "bg-surface-alt text-ink-subtle" },
  pending: { label: "Pending", tone: "bg-gold-soft text-ink" },
};

const SUBMISSION_STATUS: Record<string, string> = {
  submitted: "bg-gold-soft text-ink",
  under_review: "bg-navy/10 text-navy",
  needs_changes: "bg-gold-soft text-ink",
  approved: "bg-positive-soft text-positive",
  rejected: "bg-negative-soft text-negative",
  withdrawn: "bg-surface-alt text-ink-subtle",
};

const PILL = "inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-caption font-medium";

export function PreconStatusPill({ status }: { status: string }) {
  const entry = PRECON_STATUS[status] ?? { label: status, tone: "bg-surface-alt text-ink-muted" };
  return <span className={cn(PILL, entry.tone)}>{entry.label}</span>;
}

export function SubmissionStatusPill({ status, label }: { status: string; label: string }) {
  return <span className={cn(PILL, SUBMISSION_STATUS[status] ?? "bg-surface-alt text-ink-muted")}>{label}</span>;
}
