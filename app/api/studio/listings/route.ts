import { NextResponse } from "next/server";
import { errorResponse, guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { revalidateListingPages } from "@/app/api/studio/listings/_revalidate";
import {
  createStudioListing,
  generateListingKey,
  listStudioListings,
  type StudioListingInput,
} from "@/lib/api/estateListings";

/** GET /api/studio/listings — paginated brokerage listing search. */
export async function GET(request: Request) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;

  const url = new URL(request.url);
  try {
    const page = await listStudioListings(session.token, {
      search: url.searchParams.get("q")?.slice(0, 120) ?? "",
      publishStatus: url.searchParams.get("status") ?? "",
      page: Math.max(1, Number(url.searchParams.get("page")) || 1),
      pageSize: Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize")) || 25)),
    });
    return NextResponse.json(page);
  } catch (error) {
    return errorResponse(error, "Could not load listings.");
  }
}

/** POST /api/studio/listings — create a brokerage listing (draft unless told otherwise). */
export async function POST(request: Request) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;

  let body: StudioListingInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const listingKey = (body.listing_key ?? "").trim() || generateListingKey();
  try {
    const listing = await createStudioListing(session.token, {
      publish_status: "draft",
      standard_status: "Active",
      state_or_province: "ON",
      country: "Canada",
      ...body,
      listing_key: listingKey,
    });
    revalidateListingPages(listing.id);
    return NextResponse.json({ listing }, { status: 201 });
  } catch (error) {
    return errorResponse(error, "Could not create the listing.");
  }
}
