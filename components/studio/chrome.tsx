import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Shared chrome for the admin console. Every screen uses the same header,
 * filters, tables, and empty states so the console reads as one tool.
 */

export function StudioPage({
  kicker,
  title,
  description,
  meta,
  actions,
  note,
  children,
  className,
}: {
  kicker?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
  /** Status line that stays with the title, above the page content. */
  note?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-6", className)}>
      <header className="border-b border-line pb-5">
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
          <div className="min-w-0">
            {kicker ? <p className="text-caption font-medium text-ink-muted">{kicker}</p> : null}
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-h1 text-ink">{title}</h1>
              {meta}
            </div>
            {description ? <p className="mt-1.5 max-w-3xl text-small text-ink-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
        {note ? <div className="mt-4">{note}</div> : null}
      </header>
      {children}
    </div>
  );
}

export function StudioBack({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-caption font-medium text-ink-muted hover:text-navy">
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}

export function StudioAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-surface border border-negative/25 bg-negative-soft px-4 py-3 text-small text-ink">
      {children}
    </p>
  );
}

export function StudioEmpty({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-surface border border-line bg-surface px-6 py-12 text-center shadow-card">
      <h2 className="text-h3 text-ink">{title}</h2>
      {children ? <p className="mx-auto mt-2 max-w-md text-small text-ink-muted">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function StudioPanel({
  title,
  description,
  action,
  children,
  className,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-surface border border-line bg-surface p-5 shadow-card sm:p-6", className)}>
      {title || action ? (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            {title ? <h2 className="text-h3 text-ink">{title}</h2> : null}
            {description ? <p className="mt-1 text-small text-ink-muted">{description}</p> : null}
          </div>
          {action}
        </div>
      ) : null}
      <div className={title || action ? "mt-4" : undefined}>{children}</div>
    </section>
  );
}

export function StudioSegment({ label, children }: { label: string; children: ReactNode }) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-1 rounded-control bg-surface p-1 shadow-card ring-1 ring-line">
      {children}
    </nav>
  );
}

export function segmentItem(active: boolean) {
  return cn(
    "rounded-[0.6rem] px-3 py-1.5 text-caption font-medium transition-colors",
    active ? "bg-navy text-white" : "text-ink-muted hover:bg-surface-alt hover:text-ink",
  );
}

export const studioSearch =
  "h-10 w-full rounded-control border border-line bg-surface px-3 text-small text-ink shadow-card placeholder:text-ink-subtle focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy sm:w-72";

export const studioTableWrap = "overflow-x-auto rounded-surface border border-line bg-surface shadow-card";

/** Horizontal bleed that matches the shell's main padding. */
export const studioCanvasBleed = "-mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8";

/** Pulls a bar flush with the scrolling canvas. */
export const studioStickyTop = `sticky top-0 z-20 -mt-6 border-b border-line bg-surface-alt/95 backdrop-blur-md sm:-mt-7 lg:-mt-8 ${studioCanvasBleed}`;
