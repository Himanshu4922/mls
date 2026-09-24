"use client";

import { SafeImage } from "@/components/ui/SafeImage";
import Link from "next/link";
import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/States";

/**
 * Compact rows for the navbar Watched panel. Deliberately lighter than
 * <PropertyRow>: a 420px dropdown fits an address and one meta line, not specs.
 */
export function PreviewList({ children }: { children: ReactNode }) {
  return <ul className="divide-y divide-line-soft">{children}</ul>;
}

export function PreviewRow({
  href,
  title,
  meta,
  trailing,
  image,
  icon = "home",
  onNavigate,
}: {
  href: string;
  title: string;
  meta?: string | null;
  trailing?: string | null;
  /**
   * Only pass live listing photos here. Snapshot images may come from hosts
   * next.config does not allow, and next/image throws on those.
   */
  image?: string | null;
  icon?: "home" | "note" | "pin";
  onNavigate: () => void;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onNavigate}
        className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-alt"
      >
        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-control bg-surface-alt text-ink-subtle">
          {image ? (
            <SafeImage src={image} alt="" fill sizes="40px" className="object-cover" />
          ) : (
            <RowGlyph kind={icon} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-small font-medium text-ink">{title}</span>
          {meta && <span className="block truncate text-caption text-ink-muted">{meta}</span>}
        </span>
        {trailing && (
          <span className="shrink-0 text-caption font-medium text-ink">{trailing}</span>
        )}
      </Link>
    </li>
  );
}

export function PreviewSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div role="status" aria-label="Loading" className="space-y-3 px-4 py-3">
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Empty state from HomeAtlasUI's Watched dropdown (Navbar L178-195). */
export function PreviewEmpty({
  message,
  action,
}: {
  message: string;
  action: { label: string; href?: string; onClick?: () => void };
}) {
  const actionClass = "mt-3 inline-block text-caption font-medium text-gold hover:underline";
  return (
    <div className="px-4 py-10 text-center">
      <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-surface bg-surface-alt text-line">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="text-small text-ink-muted">{message}</p>
      {action.href ? (
        <Link href={action.href} onClick={action.onClick} className={actionClass}>
          {action.label} &rarr;
        </Link>
      ) : (
        <button type="button" onClick={action.onClick} className={actionClass}>
          {action.label} &rarr;
        </button>
      )}
    </div>
  );
}

function RowGlyph({ kind }: { kind: "home" | "note" | "pin" }) {
  const paths = {
    home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1v-9.5Z",
    note: "M6 3h9l5 5v12a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Zm8 0v5h5M8 13h8M8 17h5",
    pin: "M12 21s7-6.1 7-11.5a7 7 0 1 0-14 0C5 14.9 12 21 12 21Zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d={paths[kind]}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
