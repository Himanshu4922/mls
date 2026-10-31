"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { StudioAlert, StudioEmpty, StudioPage, StudioPanel } from "@/components/studio/chrome";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { FeaturedBoardSkeleton } from "@/components/studio/StudioSkeletons";
import { useUserKeys } from "@/components/providers/AuthProvider";
import { fetchJson } from "@/lib/queries/fetcher";
import { useFeaturedListings, type FeaturedBody } from "@/lib/queries/siteStudio";
import { formatPrice, toNumber } from "@/lib/utils/format";
import { cn } from "@/lib/utils/cn";

type ListingPin = FeaturedBody["pins"][number];

function sortPins(pins: ListingPin[]) {
  return [...pins].sort((a, b) => {
    const ao = a.featured_order ?? Number.POSITIVE_INFINITY;
    const bo = b.featured_order ?? Number.POSITIVE_INFINITY;
    if (ao !== bo) return ao - bo;
    return (a.address || a.listing_key).localeCompare(b.address || b.listing_key);
  });
}

function listingLabel(listing: ListingPin) {
  return listing.address || listing.listing_key;
}

function listingMeta(listing: ListingPin) {
  const parts = [
    listing.city || null,
    formatPrice(toNumber(listing.list_price)),
    listing.standard_status || null,
    listing.listing_key ? `MLS® ${listing.listing_key}` : null,
  ].filter((part) => part && part !== "—");
  return parts.join(" · ");
}

export function FeaturedManager({ initial }: { initial: FeaturedBody }) {
  const keys = useUserKeys();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const list = useFeaturedListings(initial, submitted);
  const pins = useMemo(() => sortPins(list.data?.pins ?? []), [list.data?.pins]);
  const results = list.data?.results ?? [];
  const searching = list.isFetching && list.isPlaceholderData;
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const busy = busyKey !== null;

  function search(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(query.trim());
  }

  async function refresh() {
    if (keys) await queryClient.invalidateQueries({ queryKey: keys.featuredAll });
  }

  async function updatePin(listing: ListingPin, featured: boolean, order: number | null) {
    setBusyKey(listing.listing_key);
    setError(null);
    try {
      await fetchJson(`/api/studio/featured`, {
        method: "PATCH",
        body: {
          listing_key: listing.listing_key,
          is_featured: featured,
          featured_order: order,
          featured_until: null,
        },
        fallback: "Could not update that listing.",
      });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update that listing.");
    } finally {
      setBusyKey(null);
    }
  }

  async function addToRail(listing: ListingPin) {
    await updatePin(listing, true, pins.length + 1);
  }

  async function removeFromRail(listing: ListingPin) {
    setBusyKey(listing.listing_key);
    setError(null);
    try {
      await fetchJson(`/api/studio/featured`, {
        method: "PATCH",
        body: {
          listing_key: listing.listing_key,
          is_featured: false,
          featured_order: null,
          featured_until: null,
        },
        fallback: "Could not update that listing.",
      });
      const remaining = pins.filter((pin) => pin.listing_key !== listing.listing_key);
      await Promise.all(
        remaining.map((pin, index) =>
          fetchJson(`/api/studio/featured`, {
            method: "PATCH",
            body: {
              listing_key: pin.listing_key,
              is_featured: true,
              featured_order: index + 1,
              featured_until: null,
            },
            fallback: "Could not update that listing.",
          }),
        ),
      );
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update that listing.");
    } finally {
      setBusyKey(null);
    }
  }

  async function move(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= pins.length) return;
    const reordered = [...pins];
    const [item] = reordered.splice(index, 1);
    reordered.splice(next, 0, item);
    setBusyKey(item.listing_key);
    setError(null);
    try {
      await Promise.all(
        reordered.map((pin, order) =>
          fetchJson(`/api/studio/featured`, {
            method: "PATCH",
            body: {
              listing_key: pin.listing_key,
              is_featured: true,
              featured_order: order + 1,
              featured_until: null,
            },
            fallback: "Could not update that listing.",
          }),
        ),
      );
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update that listing.");
    } finally {
      setBusyKey(null);
    }
  }

  if (list.isPending && !list.data) return <FeaturedBoardSkeleton />;

  const pinnedKeys = new Set(pins.map((pin) => pin.listing_key));

  return (
    <StudioPage
      kicker="Listings"
      title="Featured homes"
      description="Choose which active MLS® listings lead the homepage rail. Position 1 shows first. If nothing is pinned, the site fills the rail with exclusive listings, then the newest."
      note={
        <ol className="flex flex-wrap gap-2 text-caption text-ink-muted">
          {[
            "Search for an active MLS® listing",
            "Add it to the homepage rail",
            "Reorder with the arrows",
          ].map((step, index) => (
            <li
              key={step}
              className="inline-flex items-center gap-2 rounded-control bg-surface-alt px-3 py-1.5"
            >
              <span className="font-semibold text-navy">{index + 1}</span>
              {step}
            </li>
          ))}
        </ol>
      }
    >
      {(error || list.isError) && (
        <StudioAlert>
          {error || (list.error instanceof Error ? list.error.message : "Could not search listings.")}
        </StudioAlert>
      )}

      <div className="space-y-6">
        <StudioPanel
          title="Add a home"
          description="Search the live MLS® feed by address, city, or MLS® number, then add it to the rail."
        >
          <form onSubmit={search} className="flex flex-col gap-2 sm:flex-row">
            <div className="min-w-0 flex-1">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="e.g. King St, Mississauga, or W12345678"
                aria-label="Search listings"
              />
            </div>
            <Button type="submit" variant="primary" disabled={busy || searching}>
              {searching ? "Searching…" : "Search"}
            </Button>
          </form>

          <div className="mt-4">
            {!submitted ? (
              <p className="rounded-control bg-surface-alt px-4 py-3 text-small text-ink-muted">
                Type an address, city, or MLS® number above to find a listing.
              </p>
            ) : results.length === 0 && !searching ? (
              <p className="rounded-control bg-surface-alt px-4 py-3 text-small text-ink-muted">
                No active listings matched “{submitted}”. Try a shorter address or the MLS® number.
              </p>
            ) : (
              <ul className="divide-y divide-line rounded-control border border-line">
                {results.map((listing) => {
                  const onRail = pinnedKeys.has(listing.listing_key) || listing.is_featured;
                  const isBusy = busyKey === listing.listing_key;
                  return (
                    <li
                      key={listing.listing_key}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-small font-medium text-ink">{listingLabel(listing)}</p>
                        <p className="mt-0.5 text-caption text-ink-muted">{listingMeta(listing)}</p>
                      </div>
                      <Button
                        type="button"
                        variant={onRail ? "secondary" : "primary"}
                        size="sm"
                        disabled={busy || onRail}
                        loading={isBusy}
                        onClick={() => void addToRail(listing)}
                      >
                        {onRail ? "Already on rail" : "Add to rail"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </StudioPanel>

        <StudioPanel
          title="Homepage rail"
          description="These homes show in the Featured section, in this order. Use the arrows to change position."
          action={
            pins.length > 0 ? (
              <span className="rounded-control bg-surface-alt px-2.5 py-1 text-caption font-medium text-ink-muted">
                {pins.length} pinned
              </span>
            ) : null
          }
        >
          {pins.length === 0 ? (
            <StudioEmpty title="Nothing pinned yet">
              Search above and choose Add to rail. Until then, the public homepage fills this section automatically.
            </StudioEmpty>
          ) : (
            <ol className="space-y-3">
              {pins.map((listing, index) => {
                const isBusy = busyKey === listing.listing_key;
                return (
                  <li
                    key={listing.listing_key}
                    className={cn(
                      "flex flex-col gap-3 rounded-control border border-line bg-surface px-4 py-3 sm:flex-row sm:items-center",
                      isBusy && "opacity-70",
                    )}
                  >
                    <div className="flex min-w-0 flex-1 items-start gap-3">
                      <span
                        aria-label={`Position ${index + 1}`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-navy text-caption font-semibold text-white"
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-small font-medium text-ink">{listingLabel(listing)}</p>
                        <p className="mt-0.5 text-caption text-ink-muted">{listingMeta(listing)}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1 self-end sm:self-center">
                      <IconAction
                        label={`Move ${listingLabel(listing)} up`}
                        onClick={() => void move(index, -1)}
                        disabled={busy || index === 0}
                      >
                        ↑
                      </IconAction>
                      <IconAction
                        label={`Move ${listingLabel(listing)} down`}
                        onClick={() => void move(index, 1)}
                        disabled={busy || index === pins.length - 1}
                      >
                        ↓
                      </IconAction>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        loading={isBusy}
                        onClick={() => void removeFromRail(listing)}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </StudioPanel>
      </div>
    </StudioPage>
  );
}

function IconAction({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="flex h-9 w-9 items-center justify-center rounded-control border border-line text-ink-muted transition-colors hover:border-navy hover:text-navy disabled:opacity-40"
    >
      {children}
    </button>
  );
}
