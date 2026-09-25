"use client";

import type { ReactNode } from "react";
import { PendingLink, useIsActiveHref } from "@/components/navigation/PendingNavigation";
import { cn } from "@/lib/utils/cn";

/**
 * One page link. Client-side so the clicked number highlights at once and the
 * results show a skeleton while the page loads (PendingNavigation); still a
 * real link for crawlers and new tabs.
 */
export function PaginationLink({
  href,
  label,
  current = false,
  numbered = false,
  className,
  children,
}: {
  href: string;
  label: string;
  current?: boolean;
  /** Page numbers highlight when clicked; the ← → arrows never do. */
  numbered?: boolean;
  className: string;
  children: ReactNode;
}) {
  const pendingActive = useIsActiveHref(href, current);
  const active = numbered ? pendingActive : false;
  return (
    <PendingLink
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={cn(
        className,
        active ? "border-navy bg-navy text-white" : "border-line text-ink hover:border-navy",
      )}
    >
      {children}
    </PendingLink>
  );
}
