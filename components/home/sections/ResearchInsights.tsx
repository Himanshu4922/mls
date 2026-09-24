import { SafeImage } from "@/components/ui/SafeImage";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/Badge";
import { Section } from "@/components/ui/Section";
import { safeFetch } from "@/lib/api/client";
import { getBlogPosts } from "@/lib/api/blog";
import { researchCards } from "@/lib/home/contentSections";
import { formatDate } from "@/lib/utils/format";

/**
 * "Research & Insights" — HomeAtlasUI HomePage L1022-1055.
 *
 * The three topic cards are the reference's; each now opens its own page
 * (the reference sent all three to market-trends). Below them, the latest
 * live blog posts, fetched the same way as the homepage ResearchRail. When the
 * blog is unreachable the posts row is simply omitted.
 */
export async function ResearchInsights() {
  const posts = await safeFetch(getBlogPosts(3), [], "home:research-insights");

  return (
    <Section
      tone="alt"
      eyebrow="Data & research"
      title="Research & Insights"
      description="Explore useful real estate insights and data for the GTA"
    >
      <ul className="grid gap-6 sm:grid-cols-3">
        {researchCards.map((item) => (
          <li key={item.title}>
            <Link
              href={item.href}
              className="group block h-full overflow-hidden rounded-control border border-line bg-surface transition-shadow hover:shadow-card-hover"
            >
              <div className="relative h-45 overflow-hidden">
                <SafeImage
                  src={item.img}
                  alt=""
                  fill
                  sizes="(min-width: 640px) 33vw, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-5">
                <h3 className="flex items-center gap-2 text-h3 text-ink">
                  {item.title} <span aria-hidden="true" className="text-gold">→</span>
                </h3>
                <p className="mt-1 text-small text-ink-muted">{item.desc}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {posts.length > 0 && (
        <>
          <h3 className="mt-12 text-h2 text-ink">Latest from our research desk</h3>
          <ul className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <li key={post.id} className="h-full">
                <Link
                  href={`/blog/${post.slug}`}
                  className="group flex h-full flex-col rounded-surface border border-line bg-surface p-5 transition-colors hover:border-navy"
                >
                  {post.category && <Eyebrow>{post.category}</Eyebrow>}
                  <h4 className="mt-2 text-h3 text-ink group-hover:text-navy">{post.title}</h4>
                  {post.excerpt && (
                    <p className="mt-2 line-clamp-3 text-small text-ink-muted">{post.excerpt}</p>
                  )}
                  <p className="mt-auto pt-4 text-caption text-ink-subtle">
                    {[post.author, post.publishedAt ? formatDate(post.publishedAt) : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6">
            <Link
              href="/blog"
              className="text-small font-medium text-navy underline-offset-4 hover:underline"
            >
              All research &amp; insights →
            </Link>
          </p>
        </>
      )}
    </Section>
  );
}
