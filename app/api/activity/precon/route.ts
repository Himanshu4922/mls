import { NextResponse } from "next/server";
import { apiFetch } from "@/lib/api/client";
import { requireAccessToken } from "@/lib/auth/session";
import { clientMetaHeaders } from "@/lib/utils/clientMeta";

const EVENTS = new Set(["view", "floor_plans", "pricing", "contact"]);

/**
 * POST /api/activity/precon — pre-con page views and button clicks.
 * Always answers ok so a tracking failure cannot affect the page.
 */
export async function POST(request: Request) {
  let body: { project_id?: number; event?: string; session_key?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false });
  }
  if (!body.project_id || !body.event || !EVENTS.has(body.event) || !body.session_key) {
    return NextResponse.json({ ok: false });
  }

  try {
    const token = await requireAccessToken();
    await apiFetch("/api/mls/activity/precon/", {
      method: "POST",
      token,
      headers: clientMetaHeaders(request),
      body: {
        project_id: body.project_id,
        event: body.event,
        session_key: String(body.session_key).slice(0, 64),
      },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
