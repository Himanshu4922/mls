import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { HomepageEditor } from "@/components/studio/site/HomepageEditor";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Homepage" };
export const dynamic = "force-dynamic";

export default async function StudioHomepagePage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  return <HomepageEditor />;
}
