import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { ApiError } from "@/lib/api/client";
import { SITE_KEYS, type SiteKey } from "@/lib/site/types";

export function revalidateSite() {
  revalidatePath("/", "layout");
  revalidatePath("/");
  revalidatePath("/map-search");
}

export function isSiteKey(value: string): value is SiteKey {
  return (SITE_KEYS as readonly string[]).includes(value);
}

/** Passes Django field errors through as a flat path → message map. */
export function siteError(error: unknown, fallback: string): NextResponse {
  if (error instanceof ApiError) {
    const payload = (error.payload && typeof error.payload === "object" ? error.payload : {}) as {
      fields?: Record<string, unknown>;
      detail?: unknown;
    };
    const fields: Record<string, string> = {};
    if (payload.fields && typeof payload.fields === "object") {
      for (const [key, messages] of Object.entries(payload.fields)) {
        const message = Array.isArray(messages) ? messages[0] : messages;
        if (typeof message === "string") fields[key] = message;
      }
    }
    return NextResponse.json(
      {
        error: typeof payload.detail === "string" ? payload.detail : error.message || fallback,
        fields,
        fieldErrors: fields,
        updated_at: (payload as { updated_at?: string }).updated_at,
      },
      { status: error.status || 500 },
    );
  }
  return NextResponse.json({ error: fallback }, { status: 500 });
}
