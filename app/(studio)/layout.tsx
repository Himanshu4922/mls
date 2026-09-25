import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { StudioNav } from "@/components/studio/StudioNav";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Studio", template: "%s · Studio" },
  // Private by permission, but a stray crawl should never surface it either.
  robots: { index: false, follow: false, nocache: true },
};

/**
 * The Studio shell — and the page-level half of its access control.
 *
 * `requireStudioAccess()` runs on the SERVER before any child renders, so an
 * unauthorized visitor never receives the markup at all. A 404 (not a redirect
 * or a 403) means the route reveals nothing about its own existence.
 *
 * The `/api/studio/*` routes repeat this check independently. Neither guard
 * relies on the other, and neither relies on anything the browser tells us.
 */
export default async function StudioLayout({ children }: { children: ReactNode }) {
  const session = await requireStudioAccess();
  if (!session) notFound();

  // A full-viewport app shell: the header stays put and only <main> scrolls,
  // so the editor's action bar can stick directly beneath it and every screen
  // uses the whole window width.
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-surface-alt">
      <header className="shrink-0 border-b border-line bg-surface">
        <div className="flex h-14 w-full items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/studio" className="text-h3 font-semibold text-ink">
              Studio
            </Link>
            <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-line sm:block" />
            <StudioNav isStaff={session.user.isStaff} />
          </div>

          <div className="flex items-center gap-3 text-caption text-ink-muted">
            <span className="hidden truncate md:inline">{session.user.email}</span>
            <Link
              href="/"
              className="rounded-control border border-line px-3 py-1.5 font-medium text-ink transition-colors hover:border-navy hover:text-navy"
            >
              View site
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="w-full px-4 py-6 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
