import { NextResponse } from "next/server";
import { ApiError } from "@/lib/api/client";
import type { SavedFilters } from "@/lib/api/savedSearches";

/** Backend limits, checked here so a bad payload fails with a clear message. */
const MAX_NAME = 120;
const MAX_FILTERS_BYTES = 4096;

export function errorJson(error: unknown, fallback: string) {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/** Validates `{ name?, filters? }`; returns an error string or the clean payload. */
export function readPayload(
  body: unknown,
  { requireAll }: { requireAll: boolean },
): { name?: string; filters?: SavedFilters } | string {
  if (!body || typeof body !== "object") return "Invalid request.";
  const { name, filters } = body as { name?: unknown; filters?: unknown };
  const out: { name?: string; filters?: SavedFilters } = {};

  if (name !== undefined || requireAll) {
    if (typeof name !== "string" || !name.trim()) return "Give this search a name.";
    if (name.trim().length > MAX_NAME) return `Names can be up to ${MAX_NAME} characters.`;
    out.name = name.trim();
  }
  if (filters !== undefined || requireAll) {
    if (!filters || typeof filters !== "object" || Array.isArray(filters)) {
      return "Invalid search criteria.";
    }
    const clean: SavedFilters = {};
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined && value !== "") clean[key] = String(value);
    }
    if (JSON.stringify(clean).length > MAX_FILTERS_BYTES) return "This search is too large to save.";
    out.filters = clean;
  }
  return out;
}
