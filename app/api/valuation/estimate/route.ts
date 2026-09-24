import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { estimateValue, type EstimateInput } from "@/lib/api/valuation";

/** POST /api/valuation/estimate — runs the mls-v2 comparable-sales model. */
export async function POST(request: Request) {
  let body: EstimateInput;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    return NextResponse.json(await estimateValue(body));
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Estimate failed." }, { status: 500 });
  }
}
