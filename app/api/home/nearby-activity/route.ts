import { NextResponse } from "next/server";
import { getNearbyActivity } from "@/lib/api/homeForms";
import { fail, finiteNumber, homeErrorJson } from "../_forms";

/**
 * GET /api/home/nearby-activity?lat=&lng=&radius_km=&limit= — public feed of
 * new listings around a point (the panel beside the neighbour-alert form).
 */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const lat = finiteNumber(params.get("lat"));
  const lng = finiteNumber(params.get("lng"));
  if (lat === null || lng === null || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return fail("lat and lng are required.", 400);
  }
  const radiusKm = finiteNumber(params.get("radius_km")) ?? undefined;
  const limit = finiteNumber(params.get("limit")) ?? undefined;

  try {
    const data = await getNearbyActivity({ lat, lng, radiusKm, limit });
    return NextResponse.json({
      results: Array.isArray(data?.results) ? data.results : [],
      radius_km: data?.radius_km ?? radiusKm ?? 1,
    });
  } catch (error) {
    return homeErrorJson(error, "Could not load nearby activity.");
  }
}
