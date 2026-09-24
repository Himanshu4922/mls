"use client";

import { useEffect, useRef } from "react";

const SESSION_KEY = "homeatlas.session";

/**
 * Records a listing view.
 *
 * Fires two beacons on mount:
 *  - `listing-views/`      → popularity counts (anonymous, session-scoped)
 *  - `watched/history/add/` → "Recently Viewed" (signed-in only; the route
 *    no-ops for anonymous visitors)
 *
 * Renders nothing. All failures are swallowed: telemetry must never degrade the
 * page or surface an error to the reader.
 */
export function ViewTracker({
  listingKey,
  snapshot,
}: {
  listingKey: string;
  snapshot?: Record<string, unknown>;
}) {
  const sent = useRef<string | null>(null);

  useEffect(() => {
    if (sent.current === listingKey) return;
    sent.current = listingKey;

    // Non-identifying per-browser id; the beacon serializer requires one.
    let sessionKey: string;
    try {
      sessionKey = window.localStorage.getItem(SESSION_KEY) ?? "";
      if (!sessionKey) {
        sessionKey = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
        window.localStorage.setItem(SESSION_KEY, sessionKey);
      }
    } catch {
      // Storage blocked — use an ephemeral id so the view still counts once.
      sessionKey = Math.random().toString(36).slice(2, 18).padEnd(16, "0");
    }

    const post = (url: string, body: unknown) =>
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(() => {});

    void post("/api/listing-view", {
      listing_key: listingKey,
      session_key: sessionKey,
    });
    void post("/api/watched/history", {
      property_key: listingKey,
      snapshot: snapshot ?? {},
    });
  }, [listingKey, snapshot]);

  return null;
}
