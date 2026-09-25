"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

/** Staff-only sections; every other /studio/* path belongs to Posts. */
const STAFF_SECTIONS = [
  { href: "/studio/precon", label: "Pre-con" },
  { href: "/studio/assignments", label: "Assignments" },
  { href: "/studio/team", label: "Team" },
];

const inSection = (path: string, href: string) => path === href || path.startsWith(`${href}/`);

/**
 * Studio header nav. `isStaff` only decides whether the staff tabs are
 * *shown* — each route and its API enforce it independently.
 */
export function StudioNav({ isStaff }: { isStaff: boolean }) {
  const pathname = usePathname();

  const links = [
    {
      href: "/studio",
      label: "Posts",
      match: (p: string) => inSection(p, "/studio") && !STAFF_SECTIONS.some((s) => inSection(p, s.href)),
    },
    ...(isStaff ? STAFF_SECTIONS.map((s) => ({ ...s, match: (p: string) => inSection(p, s.href) })) : []),
  ];

  return (
    <nav aria-label="Studio sections" className="-mx-1 flex min-w-0 items-center gap-1 overflow-x-auto px-1">
      {links.map((link) => {
        const active = link.match(pathname);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-control px-3 py-1.5 text-caption font-medium transition-colors",
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
