import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SeoEditor } from "@/components/studio/site/ChromeEditors";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "SEO" };
export const dynamic = "force-dynamic";

export default async function StudioSeoPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  return <SeoEditor />;
}
