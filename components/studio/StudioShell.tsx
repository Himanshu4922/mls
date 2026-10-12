"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const GROUPS = [
  {
    id: "site",
    label: "Site",
    hint: "What visitors see",
    staff: true,
    links: [
      { href: "/studio/site", label: "Homepage" },
      { href: "/studio/site/header", label: "Header and menu" },
      { href: "/studio/site/footer", label: "Footer" },
      { href: "/studio/site/contact", label: "Socials and contact" },
      { href: "/studio/connections", label: "Connections" },
      { href: "/studio/site/seo", label: "Search and sharing" },
    ],
  },
  {
    id: "content",
    label: "Content",
    hint: "Articles and lists",
    staff: false,
    links: [
      { href: "/studio", label: "Blog posts", staff: false },
      { href: "/studio/precon", label: "Pre-construction", staff: true },
      { href: "/studio/featured", label: "Featured homes", staff: true },
      { href: "/studio/incentives", label: "Buyer incentives", staff: true },
      { href: "/studio/partners", label: "Partners", staff: true },
      { href: "/studio/communities", label: "Community photos", staff: true },
      { href: "/studio/news", label: "News", staff: true },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    hint: "People and queues",
    staff: true,
    links: [
      { href: "/studio/assignments", label: "Assignment queue" },
      { href: "/studio/activity", label: "Activity" },
      { href: "/studio/team", label: "Team" },
    ],
  },
];

const RESERVED = new Set(["site", "connections", "precon", "featured", "incentives", "partners", "communities", "news", "assignments", "activity", "team"]);

function isPostPath(path: string) {
  if (path === "/studio") return true;
  const first = path.split("/")[2];
  return !!first && !RESERVED.has(first);
}

const inSection = (path: string, href: string) =>
  href === "/studio" ? isPostPath(path) : path === href || path.startsWith(`${href}/`);

export function StudioShell({
  isStaff,
  email,
  children,
}: {
  isStaff: boolean;
  email: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (window.localStorage.getItem("studio-sidebar") === "collapsed") setCollapsed(true);
  }, []);

  function hideMenu() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setCollapsed(true);
      window.localStorage.setItem("studio-sidebar", "collapsed");
      return;
    }
    setOpen(false);
  }

  function showMenu() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setCollapsed(false);
      window.localStorage.setItem("studio-sidebar", "open");
      return;
    }
    setOpen(true);
  }

  const groups = GROUPS.filter((group) => !group.staff || isStaff).map((group) => ({
    ...group,
    links: group.links.filter((link) => isStaff || !("staff" in link) || !link.staff),
  }));
  const current = groups.flatMap((group) => group.links).find((link) => inSection(pathname, link.href));

  return (
    <div className="studio-console flex h-dvh overflow-hidden bg-surface-alt text-ink">
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-ink/40 lg:hidden"
          aria-label="Close the menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        inert={collapsed && !open ? true : undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col border-r border-line bg-surface transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
          collapsed ? "lg:-translate-x-full" : "lg:translate-x-0",
        )}
      >
        <div className="border-b border-line px-5 py-5">
          <p className="text-h3 text-ink">Admin console</p>
          <p className="mt-1 text-small text-ink-muted">Change the public site. Publish when you want visitors to see it.</p>
          <button
            type="button"
            className="mt-4 flex h-11 w-full items-center justify-center rounded-control border border-line text-small font-medium text-ink hover:border-navy hover:text-navy"
            onClick={hideMenu}
          >
            <span className="lg:hidden">Close menu</span>
            <span className="hidden lg:inline">Hide menu</span>
          </button>
        </div>
        <nav aria-label="Admin console" className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
          {groups.map((group) => (
            <div key={group.id} className="pb-2">
              <p className="px-3 pb-1 pt-4 text-caption font-semibold text-ink-muted">{group.label}</p>
              <p className="px-3 pb-2 text-caption text-ink-subtle">{group.hint}</p>
              <ul className="space-y-0.5">
                {group.links.map((link) => {
                  const active = inSection(pathname, link.href);
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "block rounded-control px-3 py-2.5 text-small leading-snug",
                          active ? "bg-navy font-semibold text-white" : "text-ink hover:bg-surface-alt",
                        )}
                      >
                        {link.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-line p-4">
          <p className="truncate text-caption text-ink-muted" title={email}>{email}</p>
          <Link
            href="/"
            className="mt-3 flex h-11 items-center justify-center rounded-control border border-line text-small font-medium text-ink hover:border-navy hover:text-navy"
          >
            View the public site
          </Link>
        </div>
      </aside>

      <div className={cn("flex min-w-0 flex-1 flex-col transition-[padding] duration-200", collapsed ? "lg:pl-0" : "lg:pl-[17.5rem]")}>
        <header className={cn("flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-surface px-4", collapsed ? "" : "lg:hidden")}>
          <button
            type="button"
            className="rounded-control border border-line px-3 py-2 text-small font-medium text-ink"
            aria-expanded={open}
            onClick={showMenu}
          >
            <span className="lg:hidden">Menu</span>
            <span className="hidden lg:inline">Show menu</span>
          </button>
          <p className="min-w-0 truncate text-small font-semibold text-ink">{current?.label ?? "Admin console"}</p>
          <Link href="/" className="shrink-0 text-small font-medium text-navy">
            View site
          </Link>
        </header>
        <main id="main" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-8 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
