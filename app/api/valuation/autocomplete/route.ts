import { NextResponse } from "next/server";
import { autocompleteAddress } from "@/lib/api/valuation";

/** GET /api/valuation/autocomplete?q= — address suggestions for the wizard. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    return NextResponse.json(await autocompleteAddress(q));
  } catch {
    // An autocomplete failure should never block typing.
    return NextResponse.json([]);
  }
}
