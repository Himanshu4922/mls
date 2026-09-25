import type { Metadata } from "next";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/Badge";
import { getAllBlogPosts } from "@/lib/api/blog";
import { MARKET_CITIES } from "@/lib/api/market";
import { getAllPreconForSitemap } from "@/lib/api/sitemap";
import { COMMUNITY_CITIES } from "@/lib/constants/cities";
import { curatedGroups, curatedPath } from "@/lib/seo/curatedPages";
import { blogPath, preconPath } from "@/lib/seo/urls";
import { buildListingHref } from "@/lib/utils/searchParams";

export const metadata: Metadata = {
  title: "Sitemap",
  description: "Every section of the site in one place: homes by city, pre-construction projects, market trends and guides.",
  alternates: { canonical: "/site-map" },
};

export const revalidate = 3600;

type LinkItem = { label: string; href: string };

/**
 * HTML sitemap (scope #7, HouseSigma's "Ontario Sitemap"). For people and for
 * crawlers that follow links; the XML sitemaps in app/sitemap.ts remain the
 * index search engines read. Backend-driven sections degrade to empty.
 */
export default async function HtmlSitemapPage() {
  const [projects, posts] = await Promise.all([
    getAllPreconForSitemap().catch(() => []),
    getAllBlogPosts().catch(() => []),
  ]);

  const search: LinkItem[] = [
    { label: "Homes for sale", href: "/listings?status=Active" },
    { label: "Homes for rent", href: "/listings?tx=rent" },
    { label: "Map search", href: "/map-search" },
    { label: "Recently sold homes", href: "/recently-sold" },
    { label: "Pre-construction projects", href: "/preconstruction" },
    { label: "Pre-construction assignments", href: "/assignments" },
    { label: "Communities", href: "/communities" },
    { label: "Compare homes", href: "/compare" },
  ];
  const sell: LinkItem[] = [
    { label: "Home evaluation", href: "/home-evaluation" },
    { label: "Sell with us", href: "/sell" },
    { label: "List your property or assignment", href: "/sell/list" },
  ];

  return (
    <div className="container-page py-10">
      <Eyebrow>Sitemap</Eyebrow>
      <h1 className="mt-3 text-h1 text-ink">Everything on the site</h1>

      <div className="mt-10 grid gap-10 md:grid-cols-2 lg:grid-cols-3">
        <LinkGroup title="Search" links={search} />
        <LinkGroup title="Sell" links={sell} />
        <LinkGroup
          title="Market trends by city"
          links={MARKET_CITIES.map((city) => ({ label: `${city} market trends`, href: `/market-trends?city=${encodeURIComponent(city)}` }))}
        />
        <LinkGroup
          title="Homes for sale by city"
          links={COMMUNITY_CITIES.map((city) => ({
            label: `${city} homes for sale`,
            href: buildListingHref({ city, status: "Active" }),
          }))}
        />
        <LinkGroup
          title="Rentals by city"
          links={COMMUNITY_CITIES.map((city) => ({
            label: `${city} homes for rent`,
            href: buildListingHref({ city, transaction: "rent" }),
          }))}
        />
        {curatedGroups({ includeCities: true }).map(({ group, pages }) => (
          <LinkGroup
            key={group}
            title={`Popular searches: ${group.toLowerCase()}`}
            links={pages.map((page) => ({ label: page.label, href: curatedPath(page) }))}
          />
        ))}
        {posts.length > 0 && (
          <LinkGroup
            title="Blog"
            links={[{ label: "All articles", href: "/blog" }, ...posts.map((post) => ({ label: post.title, href: blogPath(post.slug) }))]}
          />
        )}
      </div>

      {projects.length > 0 && (
        <section className="mt-12">
          <h2 className="text-h2 text-ink">Pre-construction projects</h2>
          <ul className="mt-4 grid gap-x-8 gap-y-2 text-small sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <li key={project.id}>
                <Link href={preconPath(project.id, project.slug || project.title || "")} className="text-ink-muted hover:text-navy hover:underline">
                  {project.title || `Project ${project.id}`}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function LinkGroup({ title, links }: { title: string; links: LinkItem[] }) {
  return (
    <section>
      <h2 className="text-h3 text-ink">{title}</h2>
      <ul className="mt-3 space-y-2 text-small">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-ink-muted hover:text-navy hover:underline">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
