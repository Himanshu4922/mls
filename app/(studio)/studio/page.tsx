import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PostListTable } from "@/components/studio/PostListTable";
import { listStudioPosts, type StudioPost } from "@/lib/api/studio";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Posts" };

// Always fresh: an author who just saved must see their change, not a cache.
export const dynamic = "force-dynamic";

export default async function StudioPostsPage() {
  const session = await requireStudioAccess();
  if (!session) notFound();

  let posts: StudioPost[];
  let error: string | null = null;
  try {
    posts = await listStudioPosts(session.token);
  } catch {
    posts = [];
    error = "We couldn't load your posts. Refresh to try again.";
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-surface border border-line bg-surface p-5 sm:p-6">
        <div className="max-w-2xl">
          <h1 className="text-h1 text-ink">Blog posts</h1>
          <p className="mt-2 text-body text-ink-muted">
            Write an article, save it as a draft, then publish when it should appear on the public blog.
          </p>
        </div>
        <Link
          href="/studio/new"
          className="inline-flex h-11 items-center rounded-control bg-navy px-5 text-small font-medium text-white hover:bg-navy-deep"
        >
          New post
        </Link>
      </div>

      {error ? (
        <p
          role="alert"
          className="rounded-surface border border-negative/30 bg-surface p-4 text-small text-ink"
        >
          {error}
        </p>
      ) : (
        <PostListTable posts={posts} />
      )}
    </div>
  );
}
