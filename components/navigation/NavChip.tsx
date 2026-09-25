"use client";

import type { ReactNode } from "react";
import { PendingLink, useIsActiveHref } from "@/components/navigation/PendingNavigation";
import { cn } from "@/lib/utils/cn";

/**
 * A filter chip that is a link (blog categories, market-trends cities).
 * Selected on click, before the server has answered — see PendingNavigation.
 */
export function NavChip({
  href,
  current,
  children,
  scroll,
}: {
  href: string;
  /** Selected according to the server-rendered page. */
  current: boolean;
  children: ReactNode;
  scroll?: boolean;
}) {
  const active = useIsActiveHref(href, current);
  return (
    <PendingLink
      href={href}
      scroll={scroll}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-4 py-1.5 text-caption font-medium transition-colors",
        active
          ? "border-navy bg-navy text-white"
          : "border-line bg-surface text-ink-muted hover:border-navy hover:text-ink",
      )}
    >
      {children}
    </PendingLink>
  );
}
