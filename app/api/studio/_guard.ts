import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import { requireStudioAccess } from "@/lib/auth/session";
import type { AuthUser } from "@/lib/types/domain";

/**
 * Shared guard and error handling for every `/api/studio/*` route.
 *
 * The page-level guard in `app/(studio)/layout.tsx` stops a browser from
 * *rendering* the Studio. It does nothing to stop a direct `fetch` at these
 * routes, so each one re-checks here. This file is the actual boundary; the
 * layout guard is UX.
 */

export interface StudioContext {
  user: AuthUser;
  token: string;
}

/**
 * Returns the session, or a 404 Response to return as-is.
 *
 * 404 rather than 403: someone without access learns nothing about what lives
 * at this path.
 */
export async function guard(): Promise<StudioContext | NextResponse> {
  const session = await requireStudioAccess();
  if (!session) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return session;
}

/** Staff-only guard, for team management. */
export async function guardStaff(): Promise<StudioContext | NextResponse> {
  const session = await requireStudioAccess();
  if (!session || !session.user.isStaff) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  return session;
}

export function isGuardFailure(
  value: StudioContext | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}

/** Normalizes a thrown ApiError into a JSON response the editor can show. */
export function errorResponse(error: unknown, fallback: string): NextResponse {
  if (error instanceof ApiError) {
    // DRF field errors ({"title": ["..."]}) are the useful part of a 400 — pass
    // the payload through so the editor can attach messages to the right field.
    return NextResponse.json(
      { error: error.message, fields: error.payload ?? null },
      { status: error.status || 500 },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
