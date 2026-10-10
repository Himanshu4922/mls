const SESSION_KEY = "homeatlas.session";

/** Same non-identifying browser id the listing view beacon already stores. */
export function browserSessionKey(): string {
  try {
    let key = window.localStorage.getItem(SESSION_KEY) ?? "";
    if (!key) {
      key = crypto.randomUUID().replace(/-/g, "").slice(0, 32);
      window.localStorage.setItem(SESSION_KEY, key);
    }
    return key;
  } catch {
    return Math.random().toString(36).slice(2, 18).padEnd(16, "0");
  }
}

export type PreconActivityEvent = "view" | "floor_plans" | "pricing" | "contact";

/** Fire-and-forget. Telemetry must never surface an error on the page. */
export function trackPreconActivity(projectId: number, event: PreconActivityEvent) {
  void fetch("/api/activity/precon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_id: projectId,
      event,
      session_key: browserSessionKey(),
    }),
    keepalive: true,
  }).catch(() => {});
}
