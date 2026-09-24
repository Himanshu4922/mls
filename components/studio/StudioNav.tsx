"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

/**
 * Studio header nav. `isStaff` only decides whether the Team tab is *shown* —
 * the route and its API enforce it independently.
 */
export function StudioNav({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname();

  const links = [
    { href: "/studio", label: "Posts", match: (p: string) => p === "/studio" || p.startsWith("/studio/") && !p.startsWith("/studio/team") },
    ...(isStaff ? [{ href: "/studio/team", label: "Team", match: (p: string) => p.startsWith("/studio/team") }] : []),
  ];

  return (
    <nav aria-label="Studio sections" className="flex items-center gap-1">
      {links.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-control px-3 py-1.5 text-caption font-medium transition-colors",
              active
                ? "bg-navy text-white"
                : "text-ink-muted hover:bg-surface-alt hover:text-ink",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
