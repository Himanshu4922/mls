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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1 text-ink">Posts</h1>
          <p className="mt-1 text-small text-ink-muted">
            Write, edit and publish articles for the public blog.
          </p>
        </div>
        <Link
          href="/studio/new"
          className="rounded-control bg-navy px-4 py-2 text-small font-medium text-white transition-opacity hover:opacity-90"
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
