import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { clearCollection } from "@/lib/api/watched";
import { requireAccessToken } from "@/lib/auth/session";

const ALLOWED = ["favorites", "history", "toured", "areas"] as const;

/** POST /api/watched/clear — empty one saved collection. */
export async function POST(request: Request) {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { collection?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const collection = ALLOWED.find((name) => name === body.collection);
  if (!collection) {
    return NextResponse.json(
      { error: `collection must be one of ${ALLOWED.join(", ")}.` },
      { status: 400 },
    );
  }

  try {
    await clearCollection(token, collection);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Could not clear." }, { status: 500 });
  }
}
