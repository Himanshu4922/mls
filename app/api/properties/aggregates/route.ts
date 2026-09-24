import { NextResponse } from "next/server";
import { getMapAggregates } from "@/lib/api/geo";

/**
 * GET /api/properties/aggregates?lat_min=&lat_max=&lng_min=&lng_max=&zoom=
 * H3 cluster counts for low/mid map zooms.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const num = (key: string) => {
    const raw = params.get(key);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const latMin = num("lat_min");
  const latMax = num("lat_max");
  const lngMin = num("lng_min");
  const lngMax = num("lng_max");
  const zoom = num("zoom") ?? 11;

  if (latMin === null || latMax === null || lngMin === null || lngMax === null) {
    return NextResponse.json({ error: "Bounds are required." }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await getMapAggregates({ latMin, latMax, lngMin, lngMax }, zoom),
    );
  } catch {
    // Fall back to marker mode so the map still works without clustering.
    return NextResponse.json({ mode: "listings", clusters: [] });
  }
}
