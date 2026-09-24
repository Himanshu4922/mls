import { NextResponse } from "next/server";
import { toHomeError } from "@/lib/api/homeForms";

/** Shared plumbing for the homepage form proxies under `/api/home/*`. */

export function fail(message: string, status: number) {
  return NextResponse.json({ error: message, fieldErrors: {} }, { status });
}

export function homeErrorJson(error: unknown, fallback: string) {
  const { body, status } = toHomeError(error, fallback);
  return NextResponse.json(body, { status });
}

/** Reads a JSON object body, or null when it is missing / not an object. */
export async function readJsonObject(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/**
 * The visitor's IP as the platform reports it. Forwarded so the backend's
 * throttle and consent record see the visitor, not this server.
 */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip")?.trim() || null;
}

export function finiteNumber(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}
