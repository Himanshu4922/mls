import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/studio/PostEditor";
import { getBlogCategories } from "@/lib/api/blog";
import { getStudioPost } from "@/lib/api/studio";
import { requireStudioAccess } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/studio/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  return { title: `Edit · ${slug}` };
}

export default async function EditPostPage({ params }: PageProps<"/studio/[slug]">) {
  const session = await requireStudioAccess();
  if (!session) notFound();

  const { slug } = await params;

  const [post, categories] = await Promise.all([
    getStudioPost(session.token, slug).catch(() => null),
    getBlogCategories({ cache: "no-store" }),
  ]);

  if (!post) notFound();

  return <PostEditor post={post} categories={categories} />;
}
