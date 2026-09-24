import { NextResponse } from "next/server";
import { deleteNearbyAlert } from "@/lib/api/homeForms";
import { requireAccessToken } from "@/lib/auth/session";
import { fail, homeErrorJson } from "../../_forms";

type Context = { params: Promise<{ id: string }> };

/** DELETE /api/home/nearby-alerts/<id> — stop one of the user's alerts. */
export async function DELETE(_request: Request, context: Context) {
  const token = await requireAccessToken();
  if (!token) return fail("Sign in to manage nearby alerts.", 401);

  const { id: raw } = await context.params;
  const id = Number.parseInt(raw, 10);
  if (!Number.isFinite(id) || id <= 0 || String(id) !== raw) return fail("Not found.", 404);

  try {
    await deleteNearbyAlert(token, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return homeErrorJson(error, "Could not remove this alert.");
  }
}
