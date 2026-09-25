import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Eyebrow } from "@/components/ui/Badge";
import { getAllBlogPosts, getBlogPost } from "@/lib/api/blog";
import { formatDate } from "@/lib/utils/format";
import { ArticleBody } from "@/components/studio/ArticleBody";
import { VideoEmbed } from "@/components/media/VideoEmbed";
import { JsonLd, absoluteUrl, breadcrumbJsonLd } from "@/components/seo/JsonLd";
import { blogPath } from "@/lib/seo/urls";
import { getVideoEmbed } from "@/lib/utils/video";
import { truncateText } from "@/lib/utils/markdown";

export const revalidate = 1800;

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Article not found" };

  // The CMS carries dedicated SEO fields; fall back to the post's own copy.
  const description =
    post.seoDescription ?? (post.excerpt ? truncateText(post.excerpt, 160) : undefined);
  return {
    title: post.seoTitle ?? post.title,
    description,
    // An editor-set canonical wins (syndicated posts); otherwise the post's own URL.
    alternates: { canonical: post.seoCanonicalUrl ?? blogPath(post.slug) },
    robots: post.noindex ? { index: false, follow: true } : undefined,
    openGraph: {
      title: post.seoTitle ?? post.title,
      description,
      type: "article",
      publishedTime: post.publishedAt ?? undefined,
      images: post.thumbnail ? [post.thumbnail] : undefined,
    },
  };
}

export default async function BlogPostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  // Sanitization lives inside <ArticleBody>, shared with the Studio preview so
  // the two renderers cannot drift apart.
  // Recognised YouTube/Vimeo URLs get the click-to-play player; anything else
  // (an uploaded file served by the backend) falls back to a native <video>.
  const embed = getVideoEmbed(post.videoUrl);

  const related = (await getAllBlogPosts().catch(() => []))
    .filter((item) => item.slug !== post.slug)
    .slice(0, 3);

  return (
    <article className="pb-16">
      <JsonLd
        data={[
          {
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.seoTitle ?? post.title,
            description:
              post.seoDescription ?? (post.excerpt ? truncateText(post.excerpt, 300) : undefined),
            image: post.thumbnail ? [post.thumbnail] : undefined,
            datePublished: post.publishedAt ?? undefined,
            dateModified: post.updatedAt ?? post.publishedAt ?? undefined,
            author: post.author
              ? { "@type": "Person", name: post.author }
              : { "@type": "Organization", name: "HomeAtlas" },
            publisher: {
              "@type": "Organization",
              name: "HomeAtlas",
              url: absoluteUrl("/"),
            },
            mainEntityOfPage: absoluteUrl(blogPath(post.slug)),
            keywords: post.tags.length > 0 ? post.tags.join(", ") : undefined,
          },
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Blog", path: "/blog" },
            { name: post.title, path: blogPath(post.slug) },
          ]),
        ]}
      />
      <header className="border-b border-line bg-surface-alt py-8 sm:py-12">
        <div className="container-page max-w-3xl">
          <Link
            href="/blog"
            className="text-caption text-ink-muted underline-offset-4 hover:text-navy hover:underline"
          >
            ← All articles
          </Link>
          {post.category && (
            <div className="mt-4">
              <Eyebrow>{post.category}</Eyebrow>
            </div>
          )}
          <h1 className="mt-2 text-h1 text-ink">{post.title}</h1>
          {post.excerpt && (
            <p className="mt-3 line-clamp-3 text-body text-ink-muted">{post.excerpt}</p>
          )}
          <p className="mt-4 text-caption text-ink-subtle">
            {[post.author, post.publishedAt ? formatDate(post.publishedAt) : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </header>

      <div className="container-page max-w-3xl py-10">
        {embed && post.videoUrl ? (
          <VideoEmbed url={post.videoUrl} title={post.title} className="mb-8" />
        ) : post.videoUrl ? (
          <div className="mb-8 overflow-hidden rounded-surface border border-line">
            <video src={post.videoUrl} controls className="w-full" />
          </div>
        ) : post.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumbnail}
            alt=""
            className="mb-8 w-full rounded-surface border border-line object-cover"
          />
        ) : null}

        <ArticleBody html={post.content} />

        {post.tags.length > 0 && (
          <ul className="mt-10 flex flex-wrap gap-2" aria-label="Tags">
            {post.tags.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-line bg-surface-alt px-3 py-1 text-caption text-ink-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </div>

      {related.length > 0 && (
        <aside className="container-page max-w-3xl">
          <h2 className="text-h2 text-ink">More reading</h2>
          <ul className="mt-5 divide-y divide-line border-t border-line">
            {related.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/blog/${item.slug}`}
                  className="group flex flex-col gap-1 py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
                >
                  <span className="text-h3 text-ink group-hover:text-navy">
                    {item.title}
                  </span>
                  {item.publishedAt && (
                    <span className="text-caption text-ink-subtle">
                      {formatDate(item.publishedAt)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </article>
  );
}
