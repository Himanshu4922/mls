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
  appearance = "pill",
}: {
  href: string;
  /** Selected according to the server-rendered page. */
  current: boolean;
  children: ReactNode;
  scroll?: boolean;
  /** `solid` matches the Market Insights city chips: ink fill, square corners. */
  appearance?: "pill" | "solid";
}) {
  const active = useIsActiveHref(href, current);
  return (
    <PendingLink
      href={href}
      scroll={scroll}
      aria-current={active ? "page" : undefined}
      className={cn(
        "border font-medium transition-colors",
        appearance === "solid"
          ? "rounded-xl px-3 py-1.5 text-[12px]"
          : "rounded-full px-4 py-1.5 text-caption",
        active
          ? appearance === "solid"
            ? "border-transparent bg-ink text-white"
            : "border-navy bg-navy text-white"
          : "border-line bg-surface text-ink-muted hover:border-ink hover:text-ink",
      )}
    >
      {children}
    </PendingLink>
  );
}
