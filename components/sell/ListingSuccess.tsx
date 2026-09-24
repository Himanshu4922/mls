import { LinkButton } from "@/components/ui/Button";
import type { ListingSubmission } from "@/lib/api/listingSubmissions";

/** Gold-bordered confirmation card (HomeAtlasUI SellPage "Assignment Received"). */
export function ListingSuccess({ submission }: { submission: ListingSubmission }) {
  const noun = submission.purpose === "assignment" ? "assignment" : "listing";
  return (
    <div className="rounded-surface border border-gold bg-surface p-8 text-center shadow-card sm:p-10" role="status">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-gold-soft">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-gold" aria-hidden="true">
          <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <h2 className="text-h2 text-navy">
        {noun === "assignment" ? "Assignment received" : "Listing received"}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-small text-ink-muted">
        Thanks! Our team will review your {noun} at {submission.address_line_1}, {submission.city}
        {" "}and contact you if anything needs changing. You can track its status any time.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <LinkButton href="/watched?tab=listings" variant="primary">
          View my listings
        </LinkButton>
        <LinkButton href="/sell" variant="secondary">
          Back to Sell
        </LinkButton>
      </div>
    </div>
  );
}
