import { cn } from "@/lib/utils/cn";

/**
 * Wizard progress. Extracted from ValuationWizard so every multi-step flow
 * (valuation, list-your-property) shows progress the same way.
 *
 * - `numbered` — numbered circles joined by hairlines (ValuationWizard)
 * - `bar`      — segmented progress bars (HomeAtlasUI HomeEvaluationPage L82-86)
 */
export function Stepper({
  steps,
  current,
  variant = "numbered",
  className,
}: {
  steps: string[];
  /** Zero-based index of the active step. */
  current: number;
  variant?: "numbered" | "bar";
  className?: string;
}) {
  if (variant === "bar") {
    return (
      <div className={cn("space-y-2", className)}>
        <ol className="flex gap-2" aria-label="Progress">
          {steps.map((label, index) => (
            <li
              key={label}
              aria-current={index === current ? "step" : undefined}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index <= current ? "bg-navy" : "bg-line",
              )}
            >
              <span className="sr-only">
                {label}
                {index < current ? " (done)" : index === current ? " (current)" : ""}
              </span>
            </li>
          ))}
        </ol>
        <p className="text-caption text-ink-muted">
          Step {current + 1} of {steps.length} · <span className="text-ink">{steps[current]}</span>
        </p>
      </div>
    );
  }

  return (
    <ol className={cn("flex items-center gap-2", className)} aria-label="Progress">
      {steps.map((label, index) => (
        <li key={label} className="flex flex-1 items-center gap-2">
          <span
            aria-current={index === current ? "step" : undefined}
            className={cn(
              "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-caption font-semibold",
              index <= current ? "bg-navy text-white" : "bg-line text-ink-muted",
            )}
          >
            {index < current ? (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M3 8.5l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              index + 1
            )}
          </span>
          <span
            className={cn(
              "text-caption font-medium",
              index <= current ? "text-ink" : "text-ink-subtle",
            )}
          >
            {label}
          </span>
          {index < steps.length - 1 && (
            <span className="h-px flex-1 bg-line" aria-hidden="true" />
          )}
        </li>
      ))}
    </ol>
  );
}
