import { NextResponse } from "next/server";
import { API_BASE_URL, ApiError } from "@/lib/api/client";
import { requestPreconDocument, type PreconDocumentType } from "@/lib/api/preconstruction";
import { requireAccessToken } from "@/lib/auth/session";

const TYPES: readonly PreconDocumentType[] = ["floor_plan", "price_list", "brochure"];

/**
 * The backend builds the signed proxy URL from the Host it was called on —
 * the server-side API_BASE_URL, which may be an internal hostname the browser
 * cannot reach. Swap in the public base when one is configured.
 */
function toPublicUrl(url: string): string {
  const publicBase = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
  if (!publicBase || publicBase === API_BASE_URL || !url.startsWith(`${API_BASE_URL}/`)) return url;
  return `${publicBase}${url.slice(API_BASE_URL.length)}`;
}

/**
 * POST /api/precon/<id>/document {type} — releases a gated pre-con document.
 *
 * The backend requires a verified phone (403) and a published project with
 * that document (404); both messages are passed through so the action bar can
 * show them inline. Response: {access_url} — a short-lived signed proxy URL.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in required." }, { status: 401 });

  const raw = (await params).id;
  const id = /^\d+$/.test(raw) ? Number(raw) : NaN;
  if (!Number.isSafeInteger(id) || id <= 0) {
    return NextResponse.json({ error: "Invalid project." }, { status: 400 });
  }

  let body: { type?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const type = TYPES.find((candidate) => candidate === body.type);
  if (!type) return NextResponse.json({ error: "Unknown document type." }, { status: 400 });

  try {
    const { access_url } = await requestPreconDocument(token, id, type);
    return NextResponse.json({ access_url: toPublicUrl(access_url) });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 500 });
    }
    return NextResponse.json({ error: "Could not open the document." }, { status: 500 });
  }
}
