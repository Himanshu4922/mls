import { NextResponse } from "next/server";
import { unsubscribe } from "@/lib/api/homeForms";
import { isUnsubscribeKind, isUnsubscribeToken } from "@/lib/home/unsubscribe";
import { fail, homeErrorJson, readJsonObject } from "../_forms";

/**
 * POST /api/home/unsubscribe — the confirm button on /unsubscribe. The backend
 * answers 200 for any well-formed token, known or not, so tokens can't be probed.
 */
export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body || !isUnsubscribeKind(body.kind) || !isUnsubscribeToken(body.token)) {
    return fail("This unsubscribe link isn't valid.", 400);
  }
  try {
    const result = await unsubscribe(body.kind, body.token);
    return NextResponse.json(result ?? { unsubscribed: true });
  } catch (error) {
    return homeErrorJson(error, "Could not unsubscribe you. Please try again.");
  }
}
