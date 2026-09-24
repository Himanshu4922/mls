import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { getWatchedOverview, toggleFavorite } from "@/lib/api/watched";
import { requireAccessToken } from "@/lib/auth/session";

/**
 * POST /api/watched/favorites — toggle a saved home.
 *
 * The upstream serializer requires `property_key`, NOT `listing_key`
 * (WatchedMutationSerializer, mls/serializers.py:265). We accept either spelling
 * from the client and normalize before forwarding.
 */
export async function POST(request: Request) {
  const token = await requireAccessToken();
  if (!token) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let body: {
    property_key?: string;
    listing_key?: string;
    snapshot?: Record<string, unknown>;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const propertyKey = (body.property_key ?? body.listing_key ?? "").trim();
  if (!propertyKey) {
    return NextResponse.json({ error: "property_key is required." }, { status: 400 });
  }

  try {
    const result = await toggleFavorite(token, propertyKey, body.snapshot ?? {});
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Could not update saved homes." }, { status: 500 });
  }
}

/** GET /api/watched/favorites — saved listing keys, for hydrating the UI. */
export async function GET() {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ favorites: [] });
  try {
    const overview = await getWatchedOverview(token);
    return NextResponse.json({
      favorites: overview.favorites.map((entry) => entry.propertyKey),
    });
  } catch {
    return NextResponse.json({ favorites: [] });
  }
}
