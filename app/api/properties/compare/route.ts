import { NextResponse } from "next/server";
import { compareProperties } from "@/lib/api/properties";

/**
 * GET /api/properties/compare?ids=A&ids=B
 * Hydrates a set of listing keys for the saved-homes and compare views.
 */
export async function GET(request: Request) {
  const ids = new URL(request.url).searchParams.getAll("ids").filter(Boolean);
  if (ids.length === 0) return NextResponse.json([]);

  try {
    // The compare endpoint returns full detail; the card only needs the summary
    // fields, which PropertyDetail structurally satisfies.
    return NextResponse.json(await compareProperties(ids.slice(0, 50)));
  } catch {
    return NextResponse.json({ error: "Could not load listings." }, { status: 502 });
  }
}
