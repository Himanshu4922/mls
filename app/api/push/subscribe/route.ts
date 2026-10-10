import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import { requireAccessToken } from "@/lib/auth/session";
import { clientMetaHeaders } from "@/lib/utils/clientMeta";
import { readJsonObject } from "../../home/_forms";

async function forward(request: Request, method: "POST" | "DELETE") {
  const token = await requireAccessToken();
  if (!token) return NextResponse.json({ error: "Sign in to turn on notifications." }, { status: 401 });

  const body = await readJsonObject(request);
  if (!body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  try {
    await apiFetch("/api/mls/push/subscribe/", {
      method,
      token,
      headers: clientMetaHeaders(request),
      body,
    });
    return new NextResponse(null, { status: method === "DELETE" ? 204 : 201 });
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json({ error: error.message }, { status: error.status || 502 });
    }
    return NextResponse.json({ error: "Could not update notifications." }, { status: 502 });
  }
}

export function POST(request: Request) {
  return forward(request, "POST");
}

export function DELETE(request: Request) {
  return forward(request, "DELETE");
}
