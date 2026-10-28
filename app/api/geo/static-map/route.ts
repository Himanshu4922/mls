import { NextResponse } from "next/server";
import { latLonToTile } from "@/lib/utils/mapTile";

export const runtime = "nodejs";

/** One week — school locations do not move. */
const CACHE = "public, max-age=604800, s-maxage=604800, stale-while-revalidate=86400";

/**
 * GET /api/geo/static-map?lat=&lon=&z=
 *
 * Proxies a single OpenStreetMap tile so the browser never hotlinks OSM
 * (their tile usage policy asks for a proper User-Agent and caching). Used as
 * the school-card image when the Ministry file has coordinates but no photo.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const lat = Number(url.searchParams.get("lat"));
  const lon = Number(url.searchParams.get("lon"));
  const zoom = Number(url.searchParams.get("z") || 16);

  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -85 || lat > 85 || lon < -180 || lon > 180) {
    return NextResponse.json({ error: "Invalid coordinates." }, { status: 400 });
  }

  const { x, y, z } = latLonToTile(lat, lon, Number.isFinite(zoom) ? zoom : 16);
  const tileUrl = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

  try {
    const upstream = await fetch(tileUrl, {
      headers: {
        // OSM asks callers to identify themselves; do not spoof a browser.
        "User-Agent": "HomeAtlas/1.0 (school location thumbnails; https://homeatlas.ca)",
        Accept: "image/png,image/*;q=0.8,*/*;q=0.5",
      },
      // Cache at the Next data layer so repeat school cards reuse one tile.
      next: { revalidate: 604_800 },
    });

    if (!upstream.ok) {
      return NextResponse.json({ error: "Map tile unavailable." }, { status: 502 });
    }

    const body = await upstream.arrayBuffer();
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("Content-Type") || "image/png",
        "Cache-Control": CACHE,
      },
    });
  } catch {
    return NextResponse.json({ error: "Map tile unavailable." }, { status: 502 });
  }
}
