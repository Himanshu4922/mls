import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Eyebrow } from "@/components/ui/Badge";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { getAllBlogPosts, getBlogCategories, type BlogPost } from "@/lib/api/blog";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

export const metadata: Metadata = {
  title: "Research & insights",
  description:
    "Market analysis, buying guides and neighbourhood research from the HomeAtlas team.",
  alternates: { canonical: "/blog" },
};

export const revalidate = 900;

export default async function BlogIndexPage({ searchParams }: PageProps<"/blog">) {
  const params = await searchParams;
  const rawCategory = Array.isArray(params.category)
    ? params.category[0]
    : params.category;

  return (
    <>
      <header className="border-b border-line bg-surface-alt py-8 sm:py-12">
        <div className="container-page">
          <Eyebrow>Research</Eyebrow>
          <h1 className="mt-3 text-h1 text-ink">Insights &amp; guides</h1>
          <p className="mt-2 max-w-2xl text-small text-ink-muted">
            Market analysis and buying guides from our team.
          </p>
        </div>
      </header>

      <div className="container-page py-10">
        <Suspense fallback={<PostsSkeleton />}>
          <PostList category={rawCategory?.trim() || null} />
        </Suspense>
      </div>
    </>
  );
}

async function PostList({ category }: { category: string | null }) {
  const [posts, categories] = await Promise.all([
    getAllBlogPosts().catch(() => null),
    getBlogCategories(),
  ]);

  if (posts === null) {
    return (
      <ErrorState
        title="Articles unavailable"
        description="We couldn't load articles right now. Please try again in a moment."
      />
    );
  }

  // Match on the category SLUG so the URL stays stable if a name is edited,
  // but fall back to the name for posts whose category arrived as a bare string.
  const filtered = category
    ? posts.filter(
        (post) =>
          post.categorySlug === category ||
          post.category?.toLowerCase() === category.toLowerCase(),
      )
    : posts;

  if (posts.length === 0) {
    return (
      <EmptyState
        title="No articles yet"
        description="New market research and guides will appear here as they're published."
      />
    );
  }

  return (
    <div className="space-y-8">
      {categories.length > 0 && (
        <nav aria-label="Filter articles by category" className="flex flex-wrap gap-2">
          <CategoryChip href="/blog" label="All" current={category === null} />
          {categories.map((item) => (
            <CategoryChip
              key={item.id}
              href={`/blog?category=${encodeURIComponent(item.slug)}`}
              label={item.name}
              current={category === item.slug}
            />
          ))}
        </nav>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          title="No articles in this category"
          description="Try another category, or browse everything we've published."
          action={{ label: "All articles", href: "/blog" }}
        />
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((post) => (
            <li key={post.id}>
              <PostCard post={post} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PostCard({ post }: { post: BlogPost }) {
  return (
    <article className="h-full">
      <Link
        href={`/blog/${post.slug}`}
        className="group flex h-full flex-col overflow-hidden rounded-surface border border-line bg-surface transition-colors hover:border-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-navy"
      >
        {post.thumbnail && (
          // A CMS thumbnail can come from any configured host, so this stays a
          // plain <img> rather than next/image with a remote-pattern allowlist.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.thumbnail}
            alt=""
            className="aspect-[16/9] w-full object-cover"
            loading="lazy"
          />
        )}
        <div className="flex flex-1 flex-col p-5">
          {post.category && <Eyebrow>{post.category}</Eyebrow>}
          <h2 className="mt-2 text-h3 text-ink group-hover:text-navy">{post.title}</h2>
          {post.excerpt && (
            <p className="mt-2 line-clamp-3 text-small text-ink-muted">{post.excerpt}</p>
          )}
          <p className="mt-auto pt-4 text-caption text-ink-subtle">
            {[post.author, post.publishedAt ? formatDate(post.publishedAt) : null]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </Link>
    </article>
  );
}

function CategoryChip({
  href,
  label,
  current,
}: {
  href: string;
  label: string;
  current: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "rounded-full border px-4 py-1.5 text-caption font-medium transition-colors",
        current
          ? "border-navy bg-navy text-white"
          : "border-line bg-surface text-ink-muted hover:border-navy hover:text-ink",
      )}
    >
      {label}
    </Link>
  );
}

function PostsSkeleton() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading articles">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-72" />
      ))}
    </div>
  );
}
