import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FooterEditor } from "@/components/studio/site/ChromeEditors";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Footer" };
export const dynamic = "force-dynamic";

export default async function StudioFooterPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  return <FooterEditor />;
}
