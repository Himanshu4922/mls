import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KeywordsEditor } from "@/components/studio/site/KeywordsEditor";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Keyword searches" };
export const dynamic = "force-dynamic";

export default async function StudioKeywordsPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  return <KeywordsEditor />;
}
