"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";

/**
 * "Clear all" behind a confirmation — every collection clear is irreversible
 * on the backend, so a single mis-click must not empty a list.
 */
export function ClearAllButton({
  what,
  onConfirm,
  disabled,
}: {
  /** Lower-case noun phrase, e.g. "saved homes". */
  what: string;
  onConfirm: () => Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not clear that list.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Clear all
      </Button>
      <Modal
        open={open}
        onClose={() => !busy && setOpen(false)}
        size="sm"
        title={`Clear all ${what}?`}
        description="This removes them from your account and can't be undone."
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" size="md" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="danger" size="md" onClick={confirm} loading={busy} disabled={busy}>
              Clear all
            </Button>
          </div>
        }
      >
        {error ? (
          <p role="alert" className="text-small text-negative">
            {error}
          </p>
        ) : (
          <p className="text-small text-ink-muted">You can save them again at any time.</p>
        )}
      </Modal>
    </>
  );
}

/** Heading row above a collection: count on the left, actions on the right. */
export function PanelToolbar({
  summary,
  children,
}: {
  summary: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-small text-ink-muted">{summary}</p>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}
