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

  return (
    <div className="flex min-h-screen flex-col bg-surface-alt">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link href="/studio" className="text-h3 font-semibold text-ink">
              Studio
            </Link>
            <span className="rounded-full border border-line px-2 py-0.5 text-caption text-ink-muted">
              Blog
            </span>
          </div>

          <StudioNav isStaff={session.user.isStaff} />

          <div className="flex items-center gap-3 text-caption text-ink-muted">
            <span className="hidden sm:inline">{session.user.email}</span>
            <Link
              href="/"
              className="rounded-control border border-line px-3 py-1.5 font-medium text-ink transition-colors hover:border-navy hover:text-navy"
            >
              View site
            </Link>
          </div>
        </div>
      </header>

      <main id="main" className="flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</div>
      </main>
    </div>
  );
}
