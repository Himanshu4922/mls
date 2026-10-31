import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingEditor } from "@/components/studio/ListingEditor";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New brokerage listing" };
export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();
  return <ListingEditor listing={null} />;
}
