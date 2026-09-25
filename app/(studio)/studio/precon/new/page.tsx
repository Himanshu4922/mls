import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreconEditor } from "@/components/studio/PreconEditor";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New project" };
export const dynamic = "force-dynamic";

export default async function NewPreconPage() {
  const session = await requireStudioAccess();
  if (!session || !session.user.isStaff) notFound();
  return <PreconEditor project={null} />;
}
