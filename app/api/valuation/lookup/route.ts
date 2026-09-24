import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { lookupSubject } from "@/lib/api/valuation";

/** GET /api/valuation/lookup?listing_key=&address= — subject property details. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const listingKey = params.get("listing_key") || undefined;
  const address = params.get("address") || undefined;

  if (!listingKey && !address) {
    return NextResponse.json(
      { error: "Provide a listing_key or address." },
      { status: 400 },
    );
  }

  try {
    return NextResponse.json(await lookupSubject({ listingKey, address }));
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Lookup failed." }, { status: 500 });
  }
}
