import { NextResponse } from "next/server";
import { createSavedSearch, listSavedSearches } from "@/lib/api/savedSearches";
import { errorJson, readPayload } from "./_shared";
import { requireAccessToken } from "@/lib/auth/session";

/** GET /api/saved-searches — the signed-in user's saved searches. */
export async function GET() {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    return NextResponse.json(await listSavedSearches(token));
  } catch (error) {
    return errorJson(error, "Could not load saved searches.");
  }
}

/**
 * POST /api/saved-searches — create. The UI only calls this when the user has
 * none; replacing an existing one goes through PUT /api/saved-searches/<id>.
 */
export async function POST(request: Request) {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const payload = readPayload(body, { requireAll: true });
  if (typeof payload === "string") return NextResponse.json({ error: payload }, { status: 400 });

  try {
    const saved = await createSavedSearch(token, {
      name: payload.name!,
      filters: payload.filters!,
    });
    return NextResponse.json(saved, { status: 201 });
  } catch (error) {
    return errorJson(error, "Could not save this search.");
  }
}
