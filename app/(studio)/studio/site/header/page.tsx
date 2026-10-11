import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HeaderEditor } from "@/components/studio/site/ChromeEditors";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Header" };
export const dynamic = "force-dynamic";

export default async function StudioHeaderPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  return <HeaderEditor />;
}
