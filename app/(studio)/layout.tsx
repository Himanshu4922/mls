import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { StudioShell } from "@/components/studio/StudioShell";
import { requireStudioAccess } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: { default: "Admin console", template: "%s · Admin" },
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
    <StudioShell isStaff={session.user.isStaff} email={session.user.email}>
      {children}
    </StudioShell>
  );
}
