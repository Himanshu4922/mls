import { LinkButton } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-eyebrow uppercase text-gold">404</p>
      <h1 className="mt-3 text-h1 text-ink">We couldn&rsquo;t find that page</h1>
      <p className="mt-2 max-w-md text-small text-ink-muted">
        The listing may have been sold or removed from the feed.
      </p>
      <div className="mt-7 flex gap-3">
        <LinkButton href="/" variant="primary">
          Back to home
        </LinkButton>
        <LinkButton href="/listings" variant="secondary">
          Browse listings
        </LinkButton>
      </div>
    </div>
  );
}
