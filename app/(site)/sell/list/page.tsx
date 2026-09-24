import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import type { Metadata } from "next";
import { Eyebrow } from "@/components/ui/Badge";
import { ListingWizard } from "@/components/sell/ListingWizard";
import { getQueryClient, getServerSession, prefetchSubmission } from "@/lib/queries/server";

export const metadata: Metadata = {
  title: "List your property",
  description: "Submit a home for sale, a rental or a pre-construction assignment for review.",
  // A per-user form with nothing to rank; keep it out of the index.
  robots: { index: false, follow: true },
};

/**
 * /sell/list — thin server wrapper. `?id=<n>` (from My listings → Continue
 * editing) is read here and passed down, so the client wizard needs no
 * useSearchParams / Suspense boundary.
 */
export default async function ListPropertyPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await searchParams;
  const raw = Array.isArray(id) ? id[0] : id;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  const submissionId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;

  // Open the wizard straight onto the draft (docs/06 Phase 3). Per-user, and
  // this page reads cookies + searchParams, so it renders per request. A
  // 403/404 fails the prefetch, which is left out of the dehydrated state; the
  // wizard then fetches and shows its own error.
  const client = getQueryClient();
  if (submissionId !== null) {
    const session = await getServerSession();
    if (session) await prefetchSubmission(client, session, submissionId);
  }

  return (
    <>
      <section className="bg-navy py-12">
        <div className="container-page">
          <Eyebrow>List with HomeAtlas</Eyebrow>
          <h1 className="mt-3 max-w-2xl text-h1 text-white">List your property or assignment</h1>
          <p className="mt-2 max-w-xl text-small text-white/70">
            Every submission is reviewed by our team before it goes live. Your contact details stay
            private.
          </p>
        </div>
      </section>
      <section className="bg-surface-alt py-10 sm:py-14">
        <div className="container-page">
          <div className="mx-auto w-full max-w-3xl">
            <HydrationBoundary state={dehydrate(client)}>
              <ListingWizard submissionId={submissionId} />
            </HydrationBoundary>
          </div>
        </div>
      </section>
    </>
  );
}
