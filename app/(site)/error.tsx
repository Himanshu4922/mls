"use client";

import { useEffect } from "react";
import { Button, LinkButton } from "@/components/ui/Button";
import { ErrorState } from "@/components/ui/States";

/**
 * Error boundary for the main site pages.
 *
 * Next 16 passes `retry` (not `reset`, as in earlier versions) — verified
 * against node_modules/next/dist/docs/01-app/.../10-error-handling.md.
 */
export default function SiteError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("Page failed to render:", error);
  }, [error]);

  return (
    <div className="container-page py-16">
      <ErrorState
        title="We couldn't load this page"
        description="The listing service isn't responding right now. This is a temporary problem on our side, not a missing page."
      />
      <div className="mt-6 flex justify-center gap-3">
        <Button variant="primary" onClick={() => retry()}>
          Try again
        </Button>
        <LinkButton href="/" variant="secondary">
          Back to home
        </LinkButton>
      </div>
      {error.digest && (
        <p className="mt-4 text-center text-caption text-ink-subtle">
          Reference: {error.digest}
        </p>
      )}
    </div>
  );
}
