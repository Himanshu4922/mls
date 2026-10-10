"use client";

import { useEffect } from "react";
import { trackPreconActivity } from "@/lib/activity/client";

/** Records one pre-con page view. Renders nothing. */
export function PreconActivityTracker({ projectId }: { projectId: number }) {
  useEffect(() => {
    trackPreconActivity(projectId, "view");
  }, [projectId]);
  return null;
}
