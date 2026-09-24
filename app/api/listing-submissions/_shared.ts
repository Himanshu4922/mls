import { NextResponse } from "next/server";
import { toSubmissionError } from "@/lib/api/listingSubmissions";
import { requireAccessToken } from "@/lib/auth/session";

/**
 * Shared plumbing for `/api/listing-submissions/*`.
 *
 * Every route needs the same three things: a signed-in token, a numeric id from
 * the dynamic segment, and DRF errors reshaped to `{error, fieldErrors}` so the
 * wizard can pin messages to the matching inputs.
 */

export async function tokenOr401(): Promise<string | NextResponse> {
  const token = await requireAccessToken();
  if (!token) {
    return NextResponse.json(
      { error: "Sign in to manage your listings.", fieldErrors: {} },
      { status: 401 },
    );
  }
  return token;
}

export function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 && String(id) === raw ? id : null;
}

export function invalidId() {
  return NextResponse.json({ error: "Not found.", fieldErrors: {} }, { status: 404 });
}

export function submissionError(error: unknown, fallback: string) {
  const { body, status } = toSubmissionError(error, fallback);
  return NextResponse.json(body, { status });
}

/** Reads a JSON object body, or null when it is missing / not an object. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
