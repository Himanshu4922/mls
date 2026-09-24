import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Button, LinkButton } from "@/components/ui/Button";

/* -------------------------------------------------------------------------- */
/* Skeletons                                                                   */
/* -------------------------------------------------------------------------- */

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-control", className)} aria-hidden="true" />;
}

export function PropertyCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-surface border border-line bg-surface">
      <Skeleton className="h-[210px] rounded-none" />
      <div className="space-y-3 p-5">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
        <div className="flex gap-3 border-y border-line py-3">
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export function PropertyGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div
      className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      role="status"
      aria-label="Loading listings"
    >
      {Array.from({ length: count }).map((_, i) => (
        <PropertyCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading listings…</span>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Empty / error                                                               */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: { label: string; href?: string; onClick?: () => void };
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-surface border border-dashed border-line bg-surface-alt/60 px-6 py-16 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-ink-subtle shadow-card">
        {icon ?? <SearchGlyph />}
      </div>
      <h3 className="text-h3 text-ink">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-small text-ink-muted">{description}</p>
      )}
      {action &&
        (action.href ? (
          <LinkButton href={action.href} variant="primary" size="md" className="mt-6">
            {action.label}
          </LinkButton>
        ) : (
          <Button variant="primary" size="md" className="mt-6" onClick={action.onClick}>
            {action.label}
          </Button>
        ))}
    </div>
  );
}

export function ErrorState({
  title = "Something went wrong",
  description,
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center rounded-surface border border-line bg-negative-soft/40 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-surface text-negative shadow-card">
        <WarningGlyph />
      </div>
      <h3 className="text-h3 text-ink">{title}</h3>
      {description && (
        <p className="mt-2 max-w-md text-small text-ink-muted">{description}</p>
      )}
      {onRetry && (
        <Button variant="secondary" size="md" className="mt-6" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/**
 * Renders when a section's data exists but a specific field the design calls for
 * is not available from the backend. Explicit by design — see docs/API_GAPS.md.
 */
export function UnavailableNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-caption text-ink-subtle", className)}>{children}</p>
  );
}

/* -------------------------------------------------------------------------- */

function SearchGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function WarningGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 9v4m0 4h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
