import { NextResponse } from "next/server";
import { recordListingView } from "@/lib/api/watched";
import { requireAccessToken } from "@/lib/auth/session";
import { clientMetaHeaders } from "@/lib/utils/clientMeta";

/**
 * POST /api/listing-view — view beacon feeding listing popularity.
 * Best-effort: always resolves ok so telemetry never affects the page.
 */
export async function POST(request: Request) {
  let body: { listing_key?: string; session_key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false });
  }
  if (!body.listing_key || !body.session_key) return NextResponse.json({ ok: false });

  try {
    const token = await requireAccessToken();
    await recordListingView(body.listing_key, body.session_key, token, clientMetaHeaders(request));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
