import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ListingEditor } from "@/components/studio/ListingEditor";
import { getStudioListing } from "@/lib/api/estateListings";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Edit brokerage listing" };
export const dynamic = "force-dynamic";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireStudioAccess();
  if (!session?.user.isStaff) notFound();

  const id = Number((await params).id);
  if (!Number.isFinite(id) || id <= 0) notFound();

  let listing;
  try {
    listing = await getStudioListing(session.token, id);
  } catch {
    notFound();
  }

  return <ListingEditor key={listing.id} listing={listing} />;
}
