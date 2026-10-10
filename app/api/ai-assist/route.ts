import { NextResponse } from "next/server";
import { apiFetch, ApiError } from "@/lib/api/client";
import { requireAccessToken } from "@/lib/auth/session";
import { clientMetaHeaders } from "@/lib/utils/clientMeta";
import { clientIp, fail, readJsonObject } from "../home/_forms";

const MAX_CHARS = 500;

export interface AssistLink {
  label: string;
  href: string;
}

export interface AssistReply {
  answer: string;
  links: AssistLink[];
  handoff: "none" | "whatsapp" | "contact";
  fallback: boolean;
}

/**
 * POST /api/ai-assist — proxies `POST /api/mls/ai/assist/`.
 * The OpenAI key stays on the backend. Guests are allowed; the backend
 * rate-limits per visitor IP.
 */
export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return fail("Invalid request.", 400);

  const question = typeof body.question === "string" ? body.question.trim().slice(0, MAX_CHARS) : "";
  if (!question) return fail("Ask a question about the site.", 400);
  const sessionKey = typeof body.session_key === "string" ? body.session_key.slice(0, 64) : "";

  const token = await requireAccessToken();
  const headers = clientMetaHeaders(request);
  const ip = clientIp(request);
  if (ip) headers["X-Forwarded-For"] = ip;

  try {
    const result = await apiFetch<AssistReply>("/api/mls/ai/assist/", {
      method: "POST",
      token,
      headers,
      body: { question, session_key: sessionKey },
      timeoutMs: 25_000,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      return NextResponse.json(
        { error: "Too many questions. Please wait a little and try again." },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "The assistant is unavailable right now." },
      { status: 502 },
    );
  }
}
