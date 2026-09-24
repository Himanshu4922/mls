import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { getPropertyNote, listPropertyNotes, savePropertyNote } from "@/lib/api/watched";
import { requireAccessToken } from "@/lib/auth/session";

/**
 * GET /api/notes?listing_key= — the user's private note for a listing.
 * GET /api/notes              — every non-empty note, newest first (Notes tab).
 */
export async function GET(request: Request) {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const listingKey = new URL(request.url).searchParams.get("listing_key");
  if (!listingKey) {
    try {
      const notes = await listPropertyNotes(token);
      return NextResponse.json({ count: notes.length, results: notes });
    } catch (error) {
      if (error instanceof ApiError) {
        return NextResponse.json({ error: error.message }, { status: error.status || 500 });
      }
      return NextResponse.json({ error: "Could not load notes." }, { status: 500 });
    }
  }

  try {
    return NextResponse.json(await getPropertyNote(token, listingKey));
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Could not load the note." }, { status: 500 });
  }
}

/** PUT /api/notes — create or update the note. */
export async function PUT(request: Request) {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: { listing_key?: string; body?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.listing_key) {
    return NextResponse.json({ error: "listing_key is required." }, { status: 400 });
  }

  try {
    return NextResponse.json(
      await savePropertyNote(token, body.listing_key, body.body ?? ""),
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Could not save the note." }, { status: 500 });
  }
}
