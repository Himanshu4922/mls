"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils/cn";

const WIDTHS = [
  { id: "mobile", label: "Mobile", width: 390 },
  { id: "tablet", label: "Tablet", width: 768 },
  { id: "desktop", label: "Desktop", width: 1280 },
] as const;

export function PreviewFrame({
  payload,
  open,
  onClose,
}: {
  payload: unknown;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="full"
      title="Draft preview"
      description="This is the real page size. Scroll inside it to see the whole draft. Visitors do not see it until you publish."
    >
      <PreviewStage payload={payload} onClose={onClose} />
    </Modal>
  );
}

function PreviewStage({ payload, onClose }: { payload: unknown; onClose: () => void }) {
  const frame = useRef<HTMLIFrameElement>(null);
  const onCloseRef = useRef(onClose);
  const [width, setWidth] = useState<(typeof WIDTHS)[number]["width"]>(1280);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "site-preview-ready") setReady(true);
      if (event.data?.type === "site-preview-close") onCloseRef.current();
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    frame.current?.contentWindow?.postMessage(
      { type: "site-preview", payload },
      window.location.origin,
    );
  }, [payload, ready, width]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-muted">Choose a screen size. The preview stays at that width so type and spacing stay accurate.</p>
        <div className="flex rounded-control border border-line p-1" role="group" aria-label="Preview size">
          {WIDTHS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setWidth(item.width)}
              className={cn(
                "rounded-control px-3 py-1.5 text-small font-medium",
                width === item.width ? "bg-navy text-white" : "text-ink-muted hover:text-ink",
              )}
              aria-pressed={width === item.width}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>
      {!ready && (
        <p className="mt-3 text-small text-ink-muted" role="status">
          Loading the preview…
        </p>
      )}
      <div className="mt-4 min-h-0 flex-1 overflow-auto rounded-control bg-surface-alt p-3">
        <iframe
          ref={frame}
          title="Site preview"
          src="/studio/site/preview"
          className="mx-auto block h-[calc(100dvh-13rem)] min-h-[24rem] border border-line bg-surface"
          style={{ width }}
        />
      </div>
    </div>
  );
}
