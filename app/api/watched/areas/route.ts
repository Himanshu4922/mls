import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { followArea, unfollowArea } from "@/lib/api/watched";
import { requireAccessToken } from "@/lib/auth/session";

/** POST /api/watched/areas — follow or unfollow a community/area. */
export async function POST(request: Request) {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: {
    area_key?: string;
    area_label?: string;
    area_kind?: string;
    action?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.area_key) {
    return NextResponse.json({ error: "area_key is required." }, { status: 400 });
  }

  try {
    if (body.action === "unfollow") {
      await unfollowArea(token, body.area_key);
    } else {
      await followArea(token, {
        areaKey: body.area_key,
        areaLabel: body.area_label,
        areaKind: body.area_kind,
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Could not update areas." }, { status: 500 });
  }
}
