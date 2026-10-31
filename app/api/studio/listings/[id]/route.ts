import { NextResponse } from "next/server";
import { errorResponse, guardStaff, isGuardFailure } from "@/app/api/studio/_guard";
import { revalidateListingPages } from "@/app/api/studio/listings/_revalidate";
import {
  deleteStudioListing,
  getStudioListing,
  updateStudioListing,
  type StudioListingInput,
} from "@/lib/api/estateListings";

type Params = { params: Promise<{ id: string }> };

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/** GET /api/studio/listings/<id> */
export async function GET(_request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  try {
    return NextResponse.json({ listing: await getStudioListing(session.token, id) });
  } catch (error) {
    return errorResponse(error, "Could not load that listing.");
  }
}

/** PATCH /api/studio/listings/<id> */
export async function PATCH(request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "Invalid listing." }, { status: 400 });

  let body: StudioListingInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  try {
    const listing = await updateStudioListing(session.token, id, body);
    revalidateListingPages(id);
    return NextResponse.json({ listing });
  } catch (error) {
    return errorResponse(error, "Could not save the listing.");
  }
}

/** DELETE /api/studio/listings/<id> */
export async function DELETE(_request: Request, { params }: Params) {
  const session = await guardStaff();
  if (isGuardFailure(session)) return session;
  const id = parseId((await params).id);
  if (!id) return NextResponse.json({ error: "Invalid listing." }, { status: 400 });
  try {
    await deleteStudioListing(session.token, id);
    revalidateListingPages(id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error, "Could not delete the listing.");
  }
}
