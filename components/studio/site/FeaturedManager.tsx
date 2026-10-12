"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { StudioAlert, StudioPage, StudioPanel } from "@/components/studio/chrome";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { FeaturedBoardSkeleton } from "@/components/studio/StudioSkeletons";
import { useUserKeys } from "@/components/providers/AuthProvider";
import { fetchJson } from "@/lib/queries/fetcher";
import { useFeaturedListings, type FeaturedBody } from "@/lib/queries/siteStudio";

type ListingPin = FeaturedBody["pins"][number];

export function FeaturedManager({ initial }: { initial: FeaturedBody }) {
  const keys = useUserKeys();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const list = useFeaturedListings(initial, submitted);
  const pins = list.data?.pins ?? [];
  const results = list.data?.results ?? [];
  const searching = list.isFetching && list.isPlaceholderData;
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function search(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(query.trim());
  }

  async function pin(listing: ListingPin, featured: boolean, order: number | null) {
    setBusy(true);
    setError(null);
    try {
      await fetchJson(`/api/studio/featured`, {
        method: "PATCH",
        body: { listing_key: listing.listing_key, is_featured: featured, featured_order: order, featured_until: null },
        fallback: "Could not update that listing.",
      });
      if (keys) await queryClient.invalidateQueries({ queryKey: keys.featuredAll });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update that listing.");
    } finally {
      setBusy(false);
    }
  }

  if (list.isPending && !list.data) return <FeaturedBoardSkeleton />;

  return (
    <StudioPage
      kicker="Listings"
      title="Featured homes"
      description="Choose which active listings lead the homepage rail. Position 1 shows first. If you pin nothing, the rail fills itself with exclusive listings, then the newest."
    >
      {(error || list.isError) && (
        <StudioAlert>{error || (list.error instanceof Error ? list.error.message : "Could not search listings.")}</StudioAlert>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <StudioPanel title="On the homepage" description="These homes show in the Featured section, in this order.">
          {pins.length === 0 ? (
            <p className="rounded-control bg-surface-alt px-4 py-3 text-small text-ink-muted">No homes are pinned yet. Search on the right and choose Pin.</p>
          ) : (
            <ul className="divide-y divide-line">
              {pins.map((listing) => (
                <PinRow key={listing.listing_key} listing={listing} busy={busy} onPin={pin} />
              ))}
            </ul>
          )}
        </StudioPanel>
        <StudioPanel title="Find a listing" description="Search by address, city, or MLS number, then pin it into the rail.">
          <div className="space-y-4">
          <form onSubmit={search} className="flex gap-2">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Address, city, or MLS number" aria-label="Search listings" />
            <Button type="submit" variant="secondary" disabled={busy || searching}>{searching ? "Searching…" : "Search"}</Button>
          </form>
          {results.length === 0 ? (
            <p className="text-small text-ink-muted">Search results show up here.</p>
          ) : (
            <ul className="divide-y divide-line">
              {results.map((listing) => (
                <li key={listing.listing_key} className="flex items-center justify-between gap-3 py-3">
                  <span className="min-w-0">
                    <span className="block text-small font-medium text-ink">{listing.address || listing.listing_key}</span>
                    <span className="block text-caption text-ink-muted">{listing.city} · {listing.standard_status}</span>
                  </span>
                  <Button type="button" variant="primary" size="sm" disabled={busy || listing.is_featured} onClick={() => void pin(listing, true, (pins.length || 0) + 1)}>
                    {listing.is_featured ? "Pinned" : "Pin"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          </div>
        </StudioPanel>
      </div>
    </StudioPage>
  );
}

function PinRow({
  listing,
  busy,
  onPin,
}: {
  listing: ListingPin;
  busy: boolean;
  onPin: (listing: ListingPin, featured: boolean, order: number | null) => Promise<void>;
}) {
  const [order, setOrder] = useState(String(listing.featured_order ?? ""));
  const title = listing.address || listing.listing_key;
  return (
    <li className="space-y-3 py-4">
      <div className="min-w-0">
        <p className="text-small font-medium text-ink">{title}</p>
        {listing.city ? <p className="mt-0.5 text-caption text-ink-muted">{listing.city}</p> : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex items-center gap-2 text-caption text-ink-muted">
          Position
          <span className="block w-20 shrink-0">
            <Input
              value={order}
              inputMode="numeric"
              aria-label={`Position for ${title}`}
              onChange={(event) => setOrder(event.target.value)}
            />
          </span>
        </label>
        <Button type="button" variant="secondary" size="md" disabled={busy} onClick={() => void onPin(listing, true, order ? Number(order) : null)}>
          Save
        </Button>
        <Button type="button" variant="ghost" size="md" disabled={busy} onClick={() => void onPin(listing, false, null)}>
          Unpin
        </Button>
      </div>
    </li>
  );
}
