import { NextResponse } from "next/server";
import { deleteSavedSearch, updateSavedSearch } from "@/lib/api/savedSearches";
import { requireAccessToken } from "@/lib/auth/session";
import { errorJson, readPayload } from "../_shared";

type Context = { params: Promise<{ id: string }> };

async function resolveId(context: Context): Promise<number | null> {
  const { id } = await context.params;
  const parsed = Number.parseInt(id, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

/**
 * PUT /api/saved-searches/<id> — rename and/or replace criteria. Partial: send
 * only `name` to rename, or `name` + `filters` to replace the saved search.
 */
export async function PUT(request: Request, context: Context) {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const id = await resolveId(context);
  if (id === null) return NextResponse.json({ error: "Invalid saved search." }, { status: 400 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const payload = readPayload(body, { requireAll: false });
  if (typeof payload === "string") return NextResponse.json({ error: payload }, { status: 400 });

  try {
    return NextResponse.json(await updateSavedSearch(token, id, payload));
  } catch (error) {
    return errorJson(error, "Could not update this saved search.");
  }
}

/** DELETE /api/saved-searches/<id> */
export async function DELETE(_request: Request, context: Context) {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const id = await resolveId(context);
  if (id === null) return NextResponse.json({ error: "Invalid saved search." }, { status: 400 });

  try {
    await deleteSavedSearch(token, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return errorJson(error, "Could not delete this saved search.");
  }
}
