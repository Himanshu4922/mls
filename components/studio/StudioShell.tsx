"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Activity,
  BadgePercent,
  Building2,
  ClipboardCheck,
  ExternalLink,
  Handshake,
  Home,
  Images,
  KeyRound,
  LayoutTemplate,
  Newspaper,
  PanelBottom,
  PanelLeft,
  PanelTop,
  PenLine,
  Search,
  Share2,
  Star,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

type Icon = LucideIcon;

const GROUPS: Array<{
  id: string;
  label: string;
  staff: boolean;
  links: Array<{ href: string; label: string; icon: Icon; staff?: boolean }>;
}> = [
  {
    id: "editorial",
    label: "Editorial",
    staff: false,
    links: [
      { href: "/studio", label: "Blog posts", icon: PenLine, staff: false },
      { href: "/studio/news", label: "News", icon: Newspaper, staff: true },
      { href: "/studio/incentives", label: "Buyer incentives", icon: BadgePercent, staff: true },
      { href: "/studio/partners", label: "Partners", icon: Handshake, staff: true },
      { href: "/studio/communities", label: "Community photos", icon: Images, staff: true },
    ],
  },
  {
    id: "listings",
    label: "Listings",
    staff: true,
    links: [
      { href: "/studio/listings", label: "Brokerage listings", icon: Home },
      { href: "/studio/precon", label: "Pre-construction", icon: Building2 },
      { href: "/studio/featured", label: "Featured homes", icon: Star },
      { href: "/studio/keywords", label: "Keyword searches", icon: Search },
      { href: "/studio/assignments", label: "Review queue", icon: ClipboardCheck },
    ],
  },
  {
    id: "site",
    label: "Public site",
    staff: true,
    links: [
      { href: "/studio/site", label: "Homepage", icon: LayoutTemplate },
      { href: "/studio/site/header", label: "Header and menu", icon: PanelTop },
      { href: "/studio/site/footer", label: "Footer", icon: PanelBottom },
      { href: "/studio/site/contact", label: "Socials and contact", icon: Share2 },
      { href: "/studio/site/seo", label: "Search and sharing", icon: Search },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    staff: true,
    links: [
      { href: "/studio/activity", label: "Activity", icon: Activity },
      { href: "/studio/team", label: "Team", icon: Users },
      { href: "/studio/connections", label: "Connections", icon: KeyRound },
    ],
  },
];

const RESERVED = new Set([
  "site",
  "connections",
  "listings",
  "precon",
  "featured",
  "keywords",
  "incentives",
  "partners",
  "communities",
  "news",
  "assignments",
  "activity",
  "team",
]);

function isPostPath(path: string) {
  if (path === "/studio") return true;
  const first = path.split("/")[2];
  return !!first && !RESERVED.has(first);
}

function matches(path: string, href: string) {
  return href === "/studio" ? isPostPath(path) : path === href || path.startsWith(`${href}/`);
}

function Mark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" className={className} aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="currentColor" />
      <path d="M7 20V12L14 7L21 12V20" stroke="#1b2e4b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M11 20V16H17V20" stroke="#1b2e4b" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="14" cy="11.5" r="1.5" fill="#1b2e4b" />
    </svg>
  );
}

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
  const [rail, setRail] = useState(false);
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (window.localStorage.getItem("studio-sidebar") === "collapsed") setRail(true);
    const query = window.matchMedia("(min-width: 1024px)");
    const sync = () => setNarrow(!query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // Lock the document: only the main pane scrolls, not the browser window.
  useEffect(() => {
    const html = document.documentElement;
    const { body } = document;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function toggleNav() {
    if (window.matchMedia("(min-width: 1024px)").matches) {
      setRail((current) => {
        const next = !current;
        window.localStorage.setItem("studio-sidebar", next ? "collapsed" : "open");
        return next;
      });
      return;
    }
    setOpen((current) => !current);
  }

  const groups = GROUPS.filter((group) => !group.staff || isStaff)
    .map((group) => ({
      ...group,
      links: group.links.filter((link) => isStaff || !link.staff),
    }))
    .filter((group) => group.links.length > 0);

  const links = groups.flatMap((group) => group.links.map((link) => ({ ...link, group: group.label })));
  const current = links
    .filter((link) => matches(pathname, link.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  const initial = (email.trim()[0] || "A").toUpperCase();

  return (
    <div className="studio-console fixed inset-0 z-10 flex overflow-hidden text-ink">
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-navy-deep/50 lg:hidden"
          aria-label="Close the menu"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        inert={narrow && !open ? true : undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[17rem] flex-col bg-navy-deep text-white transition-[width,transform] duration-200",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          rail ? "lg:w-[4.75rem]" : "lg:w-[17rem]",
        )}
      >
        <div className={cn("flex items-center gap-3 px-4 py-4", rail && "lg:justify-center lg:px-2")}>
          <Link href="/studio" className="flex min-w-0 items-center gap-3" aria-label="Admin home">
            <Mark className="h-9 w-9 shrink-0 text-gold" />
            <span className={cn("min-w-0", rail && "lg:sr-only")}>
              <span className="block text-[0.95rem] font-semibold leading-none tracking-tight">HomeAtlas</span>
              <span className="mt-1 block text-[0.6875rem] text-white/55">Admin</span>
            </span>
          </Link>
          <button
            type="button"
            className="ml-auto grid h-9 w-9 place-items-center rounded-control text-white/80 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <nav aria-label="Admin console" className="studio-nav min-h-0 flex-1 overflow-y-auto px-2 pb-4">
          {groups.map((group) => (
            <div key={group.id} className="pt-3">
              <p className={cn("px-3 pb-1.5 text-[0.6875rem] font-medium text-white/45", rail && "lg:sr-only")}>
                {group.label}
              </p>
              {rail ? <div className="mx-3 mb-1 hidden h-px bg-white/10 lg:block" aria-hidden="true" /> : null}
              <ul className="space-y-0.5">
                {group.links.map((link) => {
                  const active = current?.href === link.href;
                  const Icon = link.icon;
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        title={link.label}
                        className={cn(
                          "flex items-center gap-3 rounded-control px-3 py-2 text-small leading-snug text-white/75 transition-colors hover:bg-white/8 hover:text-white",
                          active && "bg-white/10 font-medium text-white shadow-[inset_3px_0_0_0_var(--color-gold)]",
                          rail && "lg:justify-center lg:px-0",
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" aria-hidden />
                        <span className={cn(rail && "lg:sr-only")}>{link.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={cn("border-t border-white/10 p-3", rail && "lg:px-2")}>
          <div className={cn("flex items-center gap-3 rounded-control px-1 py-1", rail && "lg:justify-center")}>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gold text-caption font-semibold text-navy-deep">
              {initial}
            </span>
            <span className={cn("min-w-0", rail && "lg:sr-only")}>
              <span className="block truncate text-caption font-medium text-white" title={email}>
                {email}
              </span>
              <span className="block text-[0.7rem] text-white/50">{isStaff ? "Staff" : "Writer"}</span>
            </span>
          </div>
        </div>
      </aside>

      <div
        className={cn(
          "flex h-full min-h-0 min-w-0 flex-1 flex-col transition-[padding] duration-200",
          rail ? "lg:pl-[4.75rem]" : "lg:pl-[17rem]",
        )}
      >
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-surface px-3 sm:px-5">
          <button
            type="button"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-control border border-line text-ink hover:border-navy hover:text-navy"
            aria-expanded={narrow ? open : !rail}
            aria-label={narrow ? (open ? "Close menu" : "Open menu") : rail ? "Expand menu" : "Collapse menu"}
            onClick={toggleNav}
          >
            <PanelLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <p className="min-w-0 flex-1 truncate text-small">
            {current ? (
              <>
                <span className="text-ink-muted">{current.group}</span>
                <span className="mx-1.5 text-ink-subtle" aria-hidden="true">
                  /
                </span>
                <span className="font-medium text-ink">{current.label}</span>
              </>
            ) : (
              <span className="font-medium text-ink">Admin console</span>
            )}
          </p>
          <Link
            href="/"
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control border border-line px-3 text-caption font-medium text-ink hover:border-navy hover:text-navy"
          >
            View site
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </header>
        <main id="main" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 sm:py-7 lg:px-8 lg:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
