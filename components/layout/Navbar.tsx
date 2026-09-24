"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useId, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { Logo } from "@/components/layout/Logo";
import { Button, LinkButton } from "@/components/ui/Button";
import { Menu, MenuItem } from "@/components/ui/Menu";
import { WatchedMenu } from "@/components/layout/WatchedMenu";
import { useAuth } from "@/components/providers/AuthProvider";
import { useWatched } from "@/components/providers/WatchedProvider";

interface NavLinkItem {
  label: string;
  href: string;
  /**
   * Extra query check for links that share a path. Buy and Rent both live on
   * /listings, so the path alone would light up both.
   */
  match?: (params: URLSearchParams) => boolean;
}

/** Mirrors parseListingParams: `tx=rent`, or the legacy `type=Rental`. */
const isRental = (params: URLSearchParams) =>
  params.get("tx") === "rent" || params.get("type") === "Rental";

const NAV_LINKS: NavLinkItem[] = [
  { label: "Buy", href: "/listings?status=Active", match: (params) => !isRental(params) },
  { label: "Rent", href: "/listings?tx=rent", match: isRental },
  { label: "Preconstruction", href: "/preconstruction" },
  { label: "Sell", href: "/sell" },
  { label: "Market Insights", href: "/market-trends" },
  { label: "Communities", href: "/communities" },
];

function isLinkActive(
  link: NavLinkItem,
  pathname: string,
  params: URLSearchParams | null,
): boolean {
  const base = link.href.split("?")[0];
  const onPath = base === "/" ? pathname === "/" : pathname.startsWith(base);
  if (!onPath || !link.match) return onPath;
  // Before the query is known (prerender fallback), a query-dependent link
  // stays unlit rather than guessing.
  return params ? link.match(params) : false;
}

/**
 * The link list, shared by the desktop bar and the mobile menu. Reading the
 * query needs `useSearchParams`, which must sit under Suspense in a layout or
 * the production build fails. The fallback renders the same links with
 * query-dependent ones unlit.
 */
function NavLinks(props: NavLinksProps) {
  return (
    <Suspense fallback={<NavLinkList {...props} params={null} />}>
      <NavLinksWithQuery {...props} />
    </Suspense>
  );
}

function NavLinksWithQuery(props: NavLinksProps) {
  const params = useSearchParams();
  return <NavLinkList {...props} params={params} />;
}

interface NavLinksProps {
  pathname: string;
  listClassName: string;
  linkClassName: (active: boolean) => string;
}

function NavLinkList({
  pathname,
  params,
  listClassName,
  linkClassName,
}: NavLinksProps & { params: URLSearchParams | null }) {
  return (
    <ul className={listClassName}>
      {NAV_LINKS.map((link) => {
        const active = isLinkActive(link, pathname, params);
        return (
          <li key={link.label}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={linkClassName(active)}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, openAuth, signOut } = useAuth();
  const { favorites } = useWatched();
  const menuId = useId();

  // Close the mobile menu when the route changes. Adjusting state during render
  // (rather than in an effect) avoids a flash of the open menu on the new page.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setMobileOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/85">
      <div className="container-page flex h-[72px] items-center justify-between gap-4 lg:h-20">
        <Logo className="shrink-0" />

        <nav aria-label="Primary" className="hidden lg:block">
          <NavLinks
            pathname={pathname}
            listClassName="flex items-center gap-6"
            linkClassName={(active) =>
              cn(
                "text-small font-medium transition-colors hover:text-gold",
                active ? "text-gold" : "text-ink",
              )
            }
          />
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <LinkButton
            href="/home-evaluation"
            variant="secondary"
            size="sm"
            className="border-gold/40 bg-gold-soft hover:bg-gold-soft/80"
          >
            <StarGlyph />
            Home Evaluation
          </LinkButton>

          {/* Keyed by pathname: remounting on navigation closes an open panel,
              the same reset the mobile menu gets from the lastPath check. */}
          <WatchedMenu key={`watched:${pathname}`} />

          {user ? (
            <UserMenu
              key={`user:${pathname}`}
              name={user.name}
              email={user.email}
              canUseStudio={user.canUseStudio}
              onSignOut={signOut}
            />
          ) : (
            <Button variant="primary" size="sm" onClick={() => openAuth("login")}>
              Sign In / Register
            </Button>
          )}
        </div>

        <button
          type="button"
          className="rounded-control p-2 text-ink lg:hidden"
          aria-expanded={mobileOpen}
          aria-controls={menuId}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          {mobileOpen ? <CloseGlyph /> : <MenuGlyph />}
        </button>
      </div>

      {mobileOpen && (
        <div id={menuId} className="border-t border-line bg-surface lg:hidden">
          <nav aria-label="Mobile" className="container-page py-2">
            <NavLinks
              pathname={pathname}
              listClassName="flex flex-col"
              linkClassName={(active) =>
                cn(
                  "block border-b border-line-soft py-3.5 text-small font-medium transition-colors",
                  active ? "text-gold" : "text-ink hover:text-gold",
                )
              }
            />
            <Link
              href="/watched"
              className="block border-b border-line-soft py-3.5 text-small font-medium text-ink hover:text-gold"
            >
              Watched{favorites.length > 0 ? ` (${favorites.length})` : ""}
            </Link>

            <div className="flex gap-3 py-4">
              <LinkButton
                href="/home-evaluation"
                variant="secondary"
                size="md"
                className="flex-1 border-gold/40 bg-gold-soft"
              >
                Home Evaluation
              </LinkButton>
              {user ? (
                <Button variant="primary" size="md" className="flex-1" onClick={signOut}>
                  Sign out
                </Button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  className="flex-1"
                  onClick={() => openAuth("login")}
                >
                  Sign In
                </Button>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

/** Account dropdown. Dismissal, Escape and focus return come from <Menu>. */
function UserMenu({
  name,
  canUseStudio,
  email,
  onSignOut,
}: {
  name: string;
  canUseStudio: boolean;
  email: string;
  onSignOut: () => void;
}) {
  const initials =
    name
      .split(" ")
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <Menu
      trigger={({ buttonProps }) => (
        <button
          type="button"
          {...buttonProps}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-navy text-caption font-semibold text-white transition-colors hover:bg-navy-deep"
        >
          <span aria-hidden="true">{initials}</span>
          <span className="sr-only">Account menu for {name}</span>
        </button>
      )}
    >
      {(close) => (
        <>
          <div className="border-b border-line px-4 py-3">
            <p className="truncate text-small font-medium text-ink">{name}</p>
            <p className="truncate text-caption text-ink-muted">{email}</p>
          </div>
          <MenuItem href="/watched" LinkComponent={Link} onSelect={close}>
            Saved homes
          </MenuItem>
          {/* Only rendered for Studio users. This is convenience, not security —
              the route and its API guard themselves server-side. */}
          {canUseStudio && (
            <MenuItem
              href="/studio"
              LinkComponent={Link}
              onSelect={close}
              className="border-t border-line font-medium text-navy"
            >
              Blog Studio
            </MenuItem>
          )}
          <MenuItem
            onSelect={() => {
              close();
              onSignOut();
            }}
          >
            Sign out
          </MenuItem>
        </>
      )}
    </Menu>
  );
}

function StarGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M10 1L12.5 7H19L13.5 11L15.5 17.5L10 14L4.5 17.5L6.5 11L1 7H7.5L10 1Z"
        stroke="var(--color-gold)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
