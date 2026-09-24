import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Titled content card for detail pages. HomeAtlasUI PropertyDetailPage
 * "Key Facts" (L285-390): hairline `rounded-surface` card with a surface-alt
 * header strip.
 *
 * `id` makes the card an anchor target for a section nav; `scroll-mt` keeps the
 * heading clear of the sticky navbar + sub-nav.
 */
export function SectionCard({
  id,
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
}: {
  id?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn(
        "scroll-mt-36 overflow-hidden rounded-surface border border-line bg-surface",
        className,
      )}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-surface-alt px-5 py-4 sm:px-6">
        <div>
          <h2 id={headingId} className="text-h3 text-ink">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-caption text-ink-muted">{description}</p>}
        </div>
        {action}
      </header>
      <div className={cn("px-5 py-5 sm:px-6", bodyClassName)}>{children}</div>
    </section>
  );
}

/**
 * Label / value grid. Rows with an empty value are dropped, so callers can pass
 * every candidate fact and let missing data disappear instead of printing "—".
 */
export function KeyFacts({
  items,
  columns = 2,
  className,
}: {
  items: Array<{ label: string; value: ReactNode | null | undefined }>;
  columns?: 1 | 2 | 3;
  className?: string;
}) {
  const rows = items.filter(
    (item) => item.value !== null && item.value !== undefined && item.value !== "",
  );
  if (rows.length === 0) return null;

  return (
    <dl
      className={cn(
        "grid gap-x-8",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        className,
      )}
    >
      {rows.map((item) => (
        <div
          key={item.label}
          className="flex items-baseline justify-between gap-4 border-b border-line-soft py-2.5"
        >
          <dt className="text-small text-ink-muted">{item.label}</dt>
          <dd className="text-right text-small font-medium text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "OR" rule between alternative actions (HomeAtlasUI AuthModal L245-249). */
export function OrDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label={label}>
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
      <span className="text-caption uppercase tracking-wider text-ink-subtle" aria-hidden="true">
        {label}
      </span>
      <span className="h-px flex-1 bg-line" aria-hidden="true" />
    </div>
  );
}
