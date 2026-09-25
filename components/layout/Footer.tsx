import Link from "next/link";
import { Logo } from "@/components/layout/Logo";
import { LinkButton } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Badge";
import { curatedPath, getCuratedPage } from "@/lib/seo/curatedPages";

/** A few curated searches (scope #24) for the footer; the full set is on /site-map. */
const POPULAR_SLUGS = ["power-of-sale", "detached-under-1m", "condos-under-500k", "luxury-homes", "open-houses", "condos-for-rent"];

const COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: "Explore",
    links: [
      { label: "Buy a home", href: "/listings?status=Active" },
      { label: "Rentals", href: "/listings?tx=rent" },
      { label: "Preconstruction", href: "/preconstruction" },
      { label: "Assignments", href: "/assignments" },
      { label: "Map search", href: "/map-search" },
      { label: "Recently sold", href: "/recently-sold" },
      { label: "Communities", href: "/communities" },
    ],
  },
  {
    heading: "Sell",
    links: [
      { label: "Home evaluation", href: "/home-evaluation" },
      { label: "Sell with us", href: "/sell" },
      { label: "Market trends", href: "/market-trends" },
    ],
  },
  {
    heading: "Popular searches",
    links: POPULAR_SLUGS.flatMap((slug) => {
      const page = getCuratedPage(slug);
      return page ? [{ label: page.label, href: curatedPath(page) }] : [];
    }),
  },
  {
    heading: "Company",
    links: [
      { label: "Saved homes", href: "/watched" },
      { label: "Compare homes", href: "/compare" },
      { label: "Blog", href: "/blog" },
      { label: "Sitemap", href: "/site-map" },
    ],
  },
];

const SOCIALS = [
  {
    label: "Facebook",
    href: "https://facebook.com",
    path: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z",
  },
  {
    label: "X",
    href: "https://x.com",
    path: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z",
  },
  {
    label: "LinkedIn",
    href: "https://linkedin.com",
    path: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z",
  },
];

export function Footer() {
  return (
    <footer className="bg-ink text-white">
      <div className="border-b border-white/10 py-16">
        <div className="container-page flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
          <div>
            <Eyebrow>Still looking?</Eyebrow>
            <h2 className="mt-2 text-h1 text-white">
              Let our team find your perfect home.
            </h2>
          </div>
          <LinkButton href="/listings" variant="accent" size="lg" className="shrink-0">
            Browse all listings →
          </LinkButton>
        </div>
      </div>

      <div className="container-page py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
          <div>
            <Logo tone="dark" />
            <p className="mt-4 max-w-[280px] text-small leading-relaxed text-white/50">
              HomeAtlas is a real estate intelligence platform providing GTA home
              valuations and market data.
            </p>
            <ul className="mt-6 flex gap-2.5">
              {SOCIALS.map((social) => (
                <li key={social.label}>
                  <a
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`HomeAtlas on ${social.label}`}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/50 transition-colors hover:border-gold hover:text-gold"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d={social.path} />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <h3 className="text-small font-semibold text-white">{column.heading}</h3>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-small text-white/50 transition-colors hover:text-gold"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10 py-6">
        <div className="container-page flex flex-col gap-3 text-caption text-white/40 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} HomeAtlas. All rights reserved.</p>
          <p className="max-w-2xl">
            MLS®, REALTOR® and associated logos are trademarks of The Canadian Real
            Estate Association. Listing data is provided for consumers&rsquo; personal,
            non-commercial use.
          </p>
        </div>
      </div>
    </footer>
  );
}
