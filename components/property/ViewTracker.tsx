"use client";

import { useEffect, useRef } from "react";
import { browserSessionKey } from "@/lib/activity/client";

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

    const sessionKey = browserSessionKey();

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
