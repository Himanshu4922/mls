import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { SITE_KEYS, type SiteKey } from "@/lib/site/types";

/** Busts homepage editorial fetches (incentives, partners, community photos). */
export const HOME_CONTENT_TAG = "home-content";

export function revalidateSite() {
  revalidateTag(HOME_CONTENT_TAG, "max");
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/communities");
  revalidatePath("/map-search");
}

export function isSiteKey(value: string): value is SiteKey {
  return (SITE_KEYS as readonly string[]).includes(value);
}

const META_KEYS = new Set(["detail", "error", "message", "fields", "non_field_errors", "updated_at"]);

function firstMessage(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" && first.trim() ? first.trim() : null;
  }
  return null;
}

/** Passes Django field errors through as a flat path → message map. */
export function siteError(error: unknown, fallback: string): NextResponse {
  if (error instanceof ApiError) {
    const payload = (error.payload && typeof error.payload === "object" ? error.payload : {}) as Record<
      string,
      unknown
    >;
    const fields: Record<string, string> = {};
    // Site documents wrap errors as `{ fields: { path: msg } }`.
    const nested = payload.fields;
    if (nested && typeof nested === "object") {
      for (const [key, messages] of Object.entries(nested as Record<string, unknown>)) {
        const message = firstMessage(messages);
        if (message) fields[key] = message;
      }
    }
    // DRF ModelSerializer validation is top-level: `{ image_url: ["…"] }`.
    for (const [key, messages] of Object.entries(payload)) {
      if (META_KEYS.has(key) || key in fields) continue;
      const message = firstMessage(messages);
      if (message) fields[key] = message;
    }
    return NextResponse.json(
      {
        error: typeof payload.detail === "string" ? payload.detail : error.message || fallback,
        fields,
        fieldErrors: fields,
        updated_at: typeof payload.updated_at === "string" ? payload.updated_at : undefined,
      },
      { status: error.status || 500 },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
