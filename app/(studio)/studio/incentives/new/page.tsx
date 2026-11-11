import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EditorialCreateForm } from "@/components/studio/site/EditorialCreateForm";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New incentive" };
export const dynamic = "force-dynamic";

export default async function NewIncentivePage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  return <EditorialCreateForm resource="incentives" />;
}
