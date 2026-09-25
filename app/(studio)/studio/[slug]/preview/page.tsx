import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArticleBody } from "@/components/studio/ArticleBody";
import { VideoEmbed } from "@/components/media/VideoEmbed";
import { getVideoEmbed } from "@/lib/utils/video";
import { getStudioPost } from "@/lib/api/studio";
import { requireStudioAccess } from "@/lib/auth/session";
import { formatDate } from "@/lib/utils/format";
import { toPlainText } from "@/lib/utils/markdown";

export const metadata: Metadata = { title: "Preview" };
export const dynamic = "force-dynamic";

/**
 * Draft preview.
 *
 * Renders through the SAME `ArticleBody` component and the same `sanitizeHtml()`
 * that `/blog/[slug]` uses. A preview built from a lookalike would drift from
 * the real page over time, and a preview you cannot trust is worse than none —
 * so the shared renderer is the point of this screen, not an implementation
 * detail.
 */
/** A post is live only once published AND its publish date has passed. */
function resolveIsLive(status: string, publishDate: string | null): boolean {
  if (status !== "published") return false;
  if (!publishDate) return true;
  const at = Date.parse(publishDate);
  return !Number.isFinite(at) || at <= Date.now();
}

export default async function PreviewPage({ params }: PageProps<"/studio/[slug]/preview">) {
  const session = await requireStudioAccess();
  if (!session) notFound();

  const { slug } = await params;
  const post = await getStudioPost(session.token, slug).catch(() => null);
  if (!post) notFound();

  // Resolved once, before render, so the JSX below stays a pure function of it.
  const isLive = resolveIsLive(post.status, post.publishDate);
  // Same plain-text treatment the public page gets from `getBlogPost`.
  const excerpt = toPlainText(post.excerpt);

  return (
    <div className="space-y-6">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 rounded-surface border border-gold/40 bg-gold-soft px-4 py-3 shadow-card">
        <p className="text-small text-ink">
          <strong>Preview.</strong>{" "}
          {isLive
            ? "This post is live — this is what readers see."
            : "This is a draft. It is not visible to the public yet."}
        </p>
        <div className="flex gap-3 text-caption">
          <Link
            href={`/studio/${encodeURIComponent(post.slug)}`}
            className="font-medium text-navy hover:underline"
          >
            Back to editing
          </Link>
          {isLive && (
            <Link
              href={`/blog/${encodeURIComponent(post.slug)}`}
              className="font-medium text-navy hover:underline"
            >
              Open live page
            </Link>
          )}
        </div>
      </div>

      <article className="rounded-surface border border-line bg-surface px-5 py-8 sm:px-10">
        <div className="mx-auto max-w-3xl">
          {post.categoryName && (
            <p className="text-caption font-medium uppercase tracking-wide text-ink-muted">
              {post.categoryName}
            </p>
          )}
          <h1 className="mt-2 text-h1 text-ink">{post.title || "(untitled)"}</h1>
          {excerpt && (
            <p className="mt-3 line-clamp-3 text-body text-ink-muted">{excerpt}</p>
          )}
          <p className="mt-4 text-caption text-ink-subtle">
            {[post.author, post.publishDate ? formatDate(post.publishDate) : "Not dated"]
              .filter(Boolean)
              .join(" · ")}
          </p>

          {/* Same video treatment as /blog/[slug], so the header matches live. */}
          {post.videoUrl && getVideoEmbed(post.videoUrl) ? (
            <VideoEmbed url={post.videoUrl} title={post.title || "Video"} className="mt-8" />
          ) : post.videoUrl ? (
            <div className="mt-8 overflow-hidden rounded-surface border border-line">
              <video src={post.videoUrl} controls className="w-full" />
            </div>
          ) : null}

          <div className="mt-8">
            <ArticleBody html={post.content} />
          </div>

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
      </article>
    </div>
  );
}
