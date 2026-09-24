import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { isUnsubscribeKind, isUnsubscribeToken } from "@/lib/home/unsubscribe";
import { UnsubscribeConfirm } from "./UnsubscribeConfirm";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false, follow: false },
};

const WHAT: Record<"newsletter" | "nearby", string> = {
  newsletter: "the HomeAtlas market newsletter",
  nearby: "new-listing alerts for this location",
};

/**
 * Landing page for the one-click unsubscribe link in homepage emails:
 * `/unsubscribe?kind=newsletter|nearby&token=…`.
 *
 * Nothing happens on load — mail scanners pre-fetch links, and a GET that
 * unsubscribed would silently drop real subscribers. The visitor confirms with
 * a button, which POSTs through `/api/home/unsubscribe`.
 */
export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const kind = typeof params.kind === "string" ? params.kind : null;
  const token = typeof params.token === "string" ? params.token : null;
  const valid = isUnsubscribeKind(kind) && isUnsubscribeToken(token);

  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
      {valid ? (
        <UnsubscribeConfirm kind={kind} token={token} what={WHAT[kind]} />
      ) : (
        <>
          <Eyebrow>Unsubscribe</Eyebrow>
          <h1 className="mt-3 max-w-xl text-h1 text-ink">This link isn&apos;t complete</h1>
          <p className="mt-3 max-w-md text-body text-ink-muted">
            It may have been cut off by your email app. Open the unsubscribe link from the
            email again, or copy the whole address into your browser.
          </p>
          <div className="mt-8">
            <LinkButton href="/" variant="secondary">
              Back to home
            </LinkButton>
          </div>
        </>
      )}
    </div>
  );
}
