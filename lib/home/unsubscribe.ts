import type { UnsubscribeKind } from "@/lib/api/homeForms";

/** Validation shared by the /unsubscribe page and its proxy route. */

export function isUnsubscribeKind(value: unknown): value is UnsubscribeKind {
  return value === "newsletter" || value === "nearby";
}

/** Backend tokens are ≤64 chars; restrict to URL-safe characters. */
export function isUnsubscribeToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(value);
}
