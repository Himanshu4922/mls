import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostEditor } from "@/components/studio/PostEditor";
import { getBlogCategories } from "@/lib/api/blog";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New post" };
export const dynamic = "force-dynamic";

export default async function NewPostPage() {
  const session = await requireStudioAccess();
  if (!session) notFound();

  const categories = await getBlogCategories({ cache: "no-store" });
  return <PostEditor post={null} categories={categories} />;
}
