import { cn } from "@/lib/utils/cn";

const PRECON_STATUS: Record<string, { label: string; tone: string; dot: string }> = {
  publish: { label: "Published", tone: "text-positive", dot: "bg-positive" },
  draft: { label: "Draft", tone: "text-ink-muted", dot: "bg-ink-subtle" },
  private: { label: "Private", tone: "text-gold-deep", dot: "bg-gold" },
  archived: { label: "Archived", tone: "text-ink-subtle", dot: "bg-ink-subtle" },
  pending: { label: "Pending", tone: "text-gold-deep", dot: "bg-gold" },
};

const SUBMISSION_STATUS: Record<string, { tone: string; dot: string }> = {
  submitted: { tone: "text-gold-deep", dot: "bg-gold" },
  under_review: { tone: "text-navy", dot: "bg-navy" },
  needs_changes: { tone: "text-gold-deep", dot: "bg-gold" },
  approved: { tone: "text-positive", dot: "bg-positive" },
  rejected: { tone: "text-negative", dot: "bg-negative" },
  withdrawn: { tone: "text-ink-subtle", dot: "bg-ink-subtle" },
};

const PILL = "inline-flex items-center gap-1.5 whitespace-nowrap text-caption font-medium";

function StatusDot({ className }: { className: string }) {
  return <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", className)} aria-hidden="true" />;
}

export function PreconStatusPill({ status }: { status: string }) {
  const entry = PRECON_STATUS[status] ?? { label: status, tone: "text-ink-muted", dot: "bg-ink-subtle" };
  return (
    <span className={cn(PILL, entry.tone)}>
      <StatusDot className={entry.dot} />
      {entry.label}
    </span>
  );
}

/** Same vocabulary as pre-con publish statuses (draft / publish / private / …). */
export function ListingStatusPill({ status }: { status: string }) {
  return <PreconStatusPill status={status} />;
}

export function SubmissionStatusPill({ status, label }: { status: string; label: string }) {
  const entry = SUBMISSION_STATUS[status] ?? { tone: "text-ink-muted", dot: "bg-ink-subtle" };
  return (
    <span className={cn(PILL, entry.tone)}>
      <StatusDot className={entry.dot} />
      {label}
    </span>
  );
}

export function StudioStatusDot({
  label,
  tone = "muted",
}: {
  label: string;
  tone?: "positive" | "negative" | "gold" | "navy" | "muted";
}) {
  const dot =
    tone === "positive"
      ? "bg-positive"
      : tone === "negative"
        ? "bg-negative"
        : tone === "gold"
          ? "bg-gold"
          : tone === "navy"
            ? "bg-navy"
            : "bg-ink-subtle";
  const text =
    tone === "positive"
      ? "text-positive"
      : tone === "negative"
        ? "text-negative"
        : tone === "gold"
          ? "text-gold-deep"
          : tone === "navy"
            ? "text-navy"
            : "text-ink-muted";
  return (
    <span className={cn(PILL, text)}>
      <StatusDot className={dot} />
      {label}
    </span>
  );
}
