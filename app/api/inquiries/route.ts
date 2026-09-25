import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import { requireAccessToken } from "@/lib/auth/session";
import { clientMetaHeaders } from "@/lib/utils/clientMeta";

/**
 * POST /api/inquiries — proxies mls-v2 `POST /api/mls/inquiries/`.
 *
 * `listing_key` is now a real column on PropertyInquiry (API_GAPS G8), so it is
 * forwarded as a field and inquiries can be grouped by property. The message
 * marker is kept as well: it costs nothing and means an agent reading the email
 * body alone still sees which listing the lead is about.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { listing_key: listingKey, ...rest } = body;
  const payload: Record<string, unknown> = { ...rest };

  // Real field since G8 — forwarded so inquiries are queryable by listing.
  if (listingKey) payload.listing_key = String(listingKey);

  if (listingKey && typeof payload.message === "string") {
    const marker = `MLS® ${listingKey}`;
    if (!payload.message.includes(String(listingKey))) {
      payload.message = `${payload.message}\n\n[Listing: ${marker}]`;
    }
  }

  // Attach the user when signed in so the inquiry links to their account.
  const token = await requireAccessToken();

  try {
    const result = await apiFetch<{ id?: number; message?: string }>(
      "/api/mls/inquiries/",
      { method: "POST", body: payload, token, headers: clientMetaHeaders(request) },
    );
    return NextResponse.json(result ?? { ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      /*
       * Django returns field errors as {"intent": ["\"showing\" is not a valid
       * choice."]}, which surfaced verbatim in the form. Two problems: it is
       * not language a lead should ever see, and "showing" only fails on a
       * backend predating the INTENT_CHOICES addition. Retry once as "buy" so
       * the lead is never lost to a deployment skew, and keep the distinction
       * in the message body for the agent reading it.
       */
      if (error.status === 400 && payload.intent === "showing") {
        try {
          const retry = await apiFetch<{ id?: number; message?: string }>(
            "/api/mls/inquiries/",
            {
              method: "POST",
              token,
              headers: clientMetaHeaders(request),
              body: {
                ...payload,
                intent: "buy",
                message: `[Showing request]\n${String(payload.message ?? "")}`,
              },
            },
          );
          return NextResponse.json(retry ?? { ok: true }, { status: 201 });
        } catch {
          // Fall through to the generic message below.
        }
      }

      // Never leak serializer field errors to the form.
      const message =
        error.status === 400
          ? "Please check your details and try again."
          : error.message;
      return NextResponse.json({ error: message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Could not send your request." }, { status: 500 });
  }
}
