import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreviewCanvas } from "@/components/studio/site/PreviewCanvas";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function SitePreviewPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  return <PreviewCanvas />;
}
