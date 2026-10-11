"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
    <div className="space-y-6">
      <div className="rounded-surface border border-line bg-surface p-5 sm:p-6">
        <h1 className="text-h1 text-ink">Featured homes</h1>
        <p className="mt-2 max-w-2xl text-body text-ink-muted">
          Choose which active listings lead the homepage rail. Position 1 shows first. If you pin nothing, the rail fills itself with exclusive listings, then the newest.
        </p>
      </div>
      {(error || list.isError) && (
        <p role="alert" className="rounded-surface border border-negative/30 bg-surface px-4 py-3 text-body text-negative">
          {error || (list.error instanceof Error ? list.error.message : "Could not search listings.")}
        </p>
      )}
      <div className="grid items-start gap-6 xl:grid-cols-2">
        <section className="rounded-surface border border-line bg-surface p-5">
          <h2 className="text-h3 text-ink">On the homepage</h2>
          <p className="mt-1 text-small text-ink-muted">These homes show in the Featured section, in this order.</p>
          {pins.length === 0 ? (
            <p className="mt-4 rounded-control bg-surface-alt px-4 py-3 text-small text-ink-muted">No homes are pinned yet. Search on the right and choose Pin.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {pins.map((listing) => (
                <PinRow key={listing.listing_key} listing={listing} busy={busy} onPin={pin} />
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-surface border border-line bg-surface p-5">
          <h2 className="text-h3 text-ink">Find a listing</h2>
          <form onSubmit={search} className="mt-4 flex gap-2">
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Address, city, or MLS number" aria-label="Search listings" />
            <Button type="submit" variant="secondary" disabled={busy || searching}>{searching ? "Searching…" : "Search"}</Button>
          </form>
          {results.length === 0 ? (
            <p className="mt-4 text-small text-ink-muted">Search results show up here.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
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
        </section>
      </div>
    </div>
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
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-3">
      <span className="min-w-0">
        <span className="block text-small font-medium text-ink">{listing.address || listing.listing_key}</span>
        <span className="block text-caption text-ink-muted">{listing.city}</span>
      </span>
      <span className="flex items-center gap-2">
        <label className="text-caption text-ink-muted">
          Position
          <Input className="mt-1 w-20" value={order} inputMode="numeric" aria-label="Position" onChange={(event) => setOrder(event.target.value)} />
        </label>
        <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={() => void onPin(listing, true, order ? Number(order) : null)}>Save</Button>
        <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => void onPin(listing, false, null)}>Unpin</Button>
      </span>
    </li>
  );
}
