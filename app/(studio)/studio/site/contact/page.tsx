import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SocialsContactEditor } from "@/components/studio/site/ChromeEditors";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Socials and contact" };
export const dynamic = "force-dynamic";

export default async function StudioSocialsPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  return <SocialsContactEditor />;
}
