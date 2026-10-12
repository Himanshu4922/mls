import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { StudioAlert, StudioPage } from "@/components/studio/chrome";
import { PostListTable } from "@/components/studio/PostListTable";
import { LinkButton } from "@/components/ui/Button";
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
    <StudioPage
      kicker="Editorial"
      title="Blog posts"
      description="Write an article, save it as a draft, then publish when it should appear on the public blog."
      actions={
        <LinkButton href="/studio/new" size="sm">
          New post
        </LinkButton>
      }
    >
      {error ? <StudioAlert>{error}</StudioAlert> : <PostListTable posts={posts} />}
    </StudioPage>
  );
}
