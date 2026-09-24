"use client";

import { useCallback, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { PreconDocumentType } from "@/lib/api/preconstruction";
import { fetchJson } from "@/lib/queries/fetcher";
import { usePhoneGate } from "@/lib/hooks/usePhoneGate";

export type DocumentState =
  | { status: "idle" }
  | { status: "loading"; type: PreconDocumentType }
  | { status: "ready"; type: PreconDocumentType; url: string }
  | { status: "error"; type: PreconDocumentType; message: string };

const OPEN_FAILED = "Could not open the document. Please try again.";

async function fetchAccessUrl(vars: {
  projectId: number;
  type: PreconDocumentType;
}): Promise<string> {
  const body = await fetchJson<{ access_url?: string }>(
    `/api/precon/${vars.projectId}/document`,
    { method: "POST", body: { type: vars.type }, fallback: OPEN_FAILED },
  );
  if (!body?.access_url) throw new Error(OPEN_FAILED);
  return body.access_url;
}

/**
 * Opens a gated pre-con document behind the phone gate.
 *
 * Popup blockers only allow `window.open` during the click itself, and the
 * access URL needs a network round trip. So when the gate passes immediately
 * (already verified) the tab is reserved synchronously inside the click and
 * pointed at the URL once it resolves — the old FE pattern
 * (precon-listings/[id] L901-926).
 *
 * When the gate first shows sign-in or OTP, the action runs later, outside the
 * click, and any `window.open` would be blocked. Then (and when a blocker
 * refuses the tab anyway) the hook ends in a "ready" state carrying the URL,
 * and the UI renders a real link — a fresh click the browser will honour.
 */
export function usePreconDocument(projectId: number) {
  const { gate } = usePhoneGate();
  const [state, setState] = useState<DocumentState>({ status: "idle" });
  // True only while the click handler is on the stack.
  const inGesture = useRef(false);
  // A write-only mutation (no cache effect). `state` below stays the source of
  // truth for the UI because it also tracks the reserved tab.
  const { mutateAsync: requestAccessUrl } = useMutation({ mutationFn: fetchAccessUrl });

  const run = useCallback(
    async (type: PreconDocumentType) => {
      // Must stay the first statement, before any await: the tab can only be
      // reserved while the click is still on the stack.
      const tab = inGesture.current ? window.open("", "_blank") : null;
      setState({ status: "loading", type });
      try {
        const url = await requestAccessUrl({ projectId, type });
        if (tab && !tab.closed) {
          tab.opener = null;
          tab.location.replace(url);
          setState({ status: "idle" });
          return;
        }
        setState({ status: "ready", type, url });
      } catch (error) {
        tab?.close();
        setState({
          status: "error",
          type,
          message: error instanceof Error ? error.message : "Could not open the document.",
        });
      }
    },
    [projectId, requestAccessUrl],
  );

  const open = useCallback(
    (type: PreconDocumentType) => {
      inGesture.current = true;
      try {
        gate(() => run(type));
      } finally {
        inGesture.current = false;
      }
    },
    [gate, run],
  );

  const reset = useCallback(() => setState({ status: "idle" }), []);

  return { open, state, reset };
}
