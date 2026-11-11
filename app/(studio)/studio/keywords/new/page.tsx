import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KeywordsEditor } from "@/components/studio/site/KeywordsEditor";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New keyword search" };
export const dynamic = "force-dynamic";

export default async function NewKeywordSearchPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  return <KeywordsEditor mode="create" />;
}
