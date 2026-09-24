import { NextResponse } from "next/server";
import { searchProperties } from "@/lib/api/properties";
import { parseListingSearch } from "@/lib/utils/searchParams";

/**
 * GET /api/properties/map?lat_min=&lat_max=&lng_min=&lng_max=&limit=[&offset=][&…listing params]
 * GET /api/properties/map?poly=lat,lng;…&limit=[&…listing params]
 *
 * Listings for the map, under the SAME filter params /listings reads (q, city,
 * type, priceMin, beds, postal, openHouse, …) via `parseListingParams`, so the
 * map and the grid can never disagree about what a filter means.
 *
 * With `poly`, the drawn area replaces the viewport box: the backend narrows to
 * the polygon's bbox in SQL, then does the exact point-in-polygon test.
 *
 * Responds `{ items, total }`.
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const num = (key: string) => {
    const raw = params.get(key);
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const query = parseListingSearch(params);
  const latMin = num("lat_min");
  const latMax = num("lat_max");
  const lngMin = num("lng_min");
  const lngMax = num("lng_max");
  const hasBounds = latMin !== null && latMax !== null && lngMin !== null && lngMax !== null;

  if (!query.polygon && !hasBounds) {
    return NextResponse.json({ error: "Bounds or a drawn area are required." }, { status: 400 });
  }

  try {
    const result = await searchProperties({
      ...query,
      // A drawn area is the whole query; the viewport around it is irrelevant.
      bounds:
        !query.polygon && latMin !== null && latMax !== null && lngMin !== null && lngMax !== null
          ? { latMin, latMax, lngMin, lngMax }
          : undefined,
      limit: Math.min(num("limit") ?? 60, 100),
      // The list pages through a view as it is scrolled.
      offset: Math.max(0, Math.floor(num("offset") ?? 0)),
    });
    return NextResponse.json({ items: result.items, total: result.total });
  } catch {
    return NextResponse.json({ error: "Could not load listings." }, { status: 502 });
  }
}
