/**
 * Headers that carry the visitor's identity through a BFF route to mls-v2.
 *
 * Browser traffic reaches Django via this server, so without these the backend
 * would record OUR address and user agent on every lead. The host (Vercel, or
 * Caddy in docker-compose) sets `x-forwarded-for`; we pass it through, and the
 * backend takes its first entry (mls/services/request_meta.py). Lead context
 * only — the value is client-influenced and never used for access control.
 */
export function clientMetaHeaders(request: Request): Record<string, string> {
  const headers: Record<string, string> = {};
  const forwarded = request.headers.get("x-forwarded-for") ?? request.headers.get("x-real-ip");
  if (forwarded) headers["X-Forwarded-For"] = forwarded;
  const agent = request.headers.get("user-agent");
  if (agent) headers["User-Agent"] = agent.slice(0, 512);
  return headers;
}
