import { NextResponse } from "next/server";
import { searchSchools } from "@/lib/api/schools";

/** GET /api/schools/search?q= — school name suggestions for “homes near school”. */
export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  try {
    return NextResponse.json(await searchSchools(q, { limit: 8 }));
  } catch {
    // Typing must never hard-fail; return an empty suggestion list.
    return NextResponse.json([]);
  }
}
