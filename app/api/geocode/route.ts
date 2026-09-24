import { NextResponse } from "next/server";
import { geocodePlace } from "@/lib/api/geo";

/** GET /api/geocode?q= — place search for the map's location box. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    return NextResponse.json(await geocodePlace(q));
  } catch {
    // A geocode failure should never block typing; return no suggestions.
    return NextResponse.json([]);
  }
}
