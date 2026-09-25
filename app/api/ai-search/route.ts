import { NextResponse } from "next/server";
import { AI_QUERY_MAX_CHARS, parseAiSearch, type AiSearchFilters } from "@/lib/api/aiSearch";
import { requireAccessToken } from "@/lib/auth/session";
import { clientIp, fail, homeErrorJson, readJsonObject } from "../home/_forms";

/**
 * POST /api/ai-search — proxies `POST /api/mls/ai-search/parse/`.
 *
 * Open to guests (the backend rate-limits per visitor IP, which is forwarded
 * here); a signed-in visitor's token is attached for the higher per-account
 * allowance. The OpenAI key never leaves the backend.
 */
export async function POST(request: Request) {
  const body = await readJsonObject(request);
  if (!body) return fail("Invalid request.", 400);

  const query = typeof body.query === "string" ? body.query.trim().slice(0, AI_QUERY_MAX_CHARS) : "";
  if (!query) return fail("Describe the home you're looking for.", 400);
  const current =
    body.currentFilters && typeof body.currentFilters === "object" && !Array.isArray(body.currentFilters)
      ? (body.currentFilters as Partial<AiSearchFilters>)
      : null;

  const token = await requireAccessToken();
  try {
    const result = await parseAiSearch(
      { query, currentFilters: current },
      { token, clientIp: clientIp(request) },
    );
    return NextResponse.json(result);
  } catch (error) {
    return homeErrorJson(error, "AI search is unavailable right now.");
  }
}
