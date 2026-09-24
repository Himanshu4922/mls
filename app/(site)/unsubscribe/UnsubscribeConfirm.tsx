"use client";

import { useMutation } from "@tanstack/react-query";
import { Eyebrow } from "@/components/ui/Badge";
import { Button, LinkButton } from "@/components/ui/Button";
import type { UnsubscribeKind } from "@/lib/api/homeForms";
import { fetchJson } from "@/lib/queries/fetcher";

/** The confirm button on /unsubscribe, and the result it leads to. */
export function UnsubscribeConfirm({
  kind,
  token,
  what,
}: {
  kind: UnsubscribeKind;
  token: string;
  what: string;
}) {
  const confirm = useMutation({
    mutationFn: () =>
      fetchJson<{ unsubscribed: boolean }>("/api/home/unsubscribe", {
        method: "POST",
        body: { kind, token },
        fallback: "Could not unsubscribe you. Please try again.",
      }),
  });

  if (confirm.isSuccess) {
    return (
      <div role="status">
        <Eyebrow>Done</Eyebrow>
        <h1 className="mt-3 max-w-xl text-h1 text-ink">You&apos;re unsubscribed</h1>
        <p className="mt-3 max-w-md text-body text-ink-muted">
          You won&apos;t receive {what} any more. It can take a few minutes for any email
          already on its way to stop.
        </p>
        <div className="mt-8">
          <LinkButton href="/" variant="secondary">
            Back to home
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Eyebrow>Unsubscribe</Eyebrow>
      <h1 className="mt-3 max-w-xl text-h1 text-ink">Stop these emails?</h1>
      <p className="mt-3 max-w-md text-body text-ink-muted">
        Confirm below and we&apos;ll stop sending you {what}.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button variant="primary" loading={confirm.isPending} onClick={() => confirm.mutate()}>
          Unsubscribe
        </Button>
        <LinkButton href="/" variant="secondary">
          Keep me subscribed
        </LinkButton>
      </div>
      {confirm.isError && (
        <p role="alert" className="mt-4 text-small text-negative">
          {confirm.error.message}
        </p>
      )}
    </div>
  );
}
