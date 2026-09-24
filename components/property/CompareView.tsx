"use client";

import { SafeImage } from "@/components/ui/SafeImage";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CompareTable } from "@/components/property/CompareTable";
import { CompareSingle } from "@/components/property/CompareSingle";
import { Button, LinkButton } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, ErrorState, Skeleton } from "@/components/ui/States";
import { useWatched } from "@/components/providers/WatchedProvider";
import { MAX_COMPARE } from "@/lib/constants/compare";
import { usePropertiesByIds } from "@/lib/queries/properties";
import { EMPTY, formatPrice } from "@/lib/utils/format";

/**
 * The compare screen.
 *
 * The URL seeds the selection, so a comparison is shareable and the back button
 * works, and the tray selection is synced INTO the URL on mount when the URL is
 * empty — that is what lets "Compare (2)" in the tray deep-link here. After
 * mount the client owns the list and writes the URL with `history.replaceState`,
 * so adding or removing a home never round-trips to the server.
 *
 * Loading is driven by TanStack Query's `isPending`. The previous hand-rolled
 * version had to seed useState with a guess, and seeded it as "empty" — so the
 * page painted "No homes selected" for a frame before the fetch even started.
 */
export function CompareView({ ids: idsFromUrl }: { ids: string[] }) {
  const { compare, toggleCompare, clearCompare, addManyToCompare } = useWatched();

  /*
   * The URL seeds this, but the client owns it from then on.
   *
   * Removing a home used to `router.push` a new query string. `/compare` is an
   * async Server Component that reads `searchParams`, so every distinct string
   * was an uncached RSC request: the server round-trip remounted this view and
   * the page visibly reloaded. Holding the list in state keeps a removal a
   * local re-render, and `history.replaceState` (below) keeps the URL
   * shareable without asking the router to navigate.
   */
  const [selection, setSelection] = useState(idsFromUrl);

  /*
   * Adopt the URL only when it genuinely differs as a SET — a back/forward or a
   * pasted link. This is the documented "adjust state during render" pattern
   * rather than an effect: comparing in an effect would render the stale list
   * for a frame first, and setting state from an effect body is exactly the
   * cascading render this page is meant to avoid.
   *
   * The signature is joined sorted keys, not array identity: `idsFromUrl` is a
   * fresh array on every render, so an identity check would re-adopt the URL on
   * each pass and undo the removal that was just made.
   */
  const urlSignature = [...idsFromUrl].sort().join(",");
  const [lastUrlSignature, setLastUrlSignature] = useState(urlSignature);

  if (lastUrlSignature !== urlSignature) {
    setLastUrlSignature(urlSignature);
    setSelection(idsFromUrl);
  }

  /*
   * A tray selection landing on a bare /compare is adopted immediately, so the
   * data query below starts on the right ids in this same render instead of
   * waiting a frame for an effect. The URL catches up in the effect further
   * down — writing to history during render would be a side effect.
   */
  const adoptingTray = idsFromUrl.length === 0 && selection.length === 0 && compare.length > 0;
  const ids = adoptingTray ? compare : selection;

  /** Update the list and the address bar without a server navigation. */
  const setIdsAndUrl = useCallback((next: string[]) => {
    setSelection(next);
    const url = next.length > 0 ? `/compare?ids=${next.join(",")}` : "/compare";
    setLastUrlSignature([...next].sort().join(","));
    window.history.replaceState(null, "", url);
  }, []);
  // Bumped on each open so <SavedPicker> remounts with a clean tick list.
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerRun, setPickerRun] = useState(0);
  const openPicker = () => {
    setPickerRun((n) => n + 1);
    setPickerOpen(true);
  };

  /*
   * Mirror an adopted tray selection into the URL, so the view is shareable and
   * refresh-stable from here on. This effect only touches `history` — an
   * external system — which is what effects are for; `ids` above already
   * reflects the tray, so nothing here changes what this render shows.
   */
  useEffect(() => {
    if (!adoptingTray) return;
    window.history.replaceState(null, "", `/compare?ids=${compare.join(",")}`);
  }, [adoptingTray, compare]);

  const query = usePropertiesByIds(ids);

  /*
   * Show the skeleton whenever homes are requested but the data is not here
   * yet. This deliberately keys off "no data and no error" rather than
   * `isPending`: during SSR and the first client render the query has not
   * started, so `isPending` is false while `data` is still undefined — keying
   * off the flag let the empty state render first, which is exactly the
   * flash this is meant to prevent.
   */
  if (ids.length > 0 && query.data === undefined && !query.isError) {
    return (
      <Shell count={ids.length}>
        <CompareSkeleton count={ids.length} />
      </Shell>
    );
  }

  if (ids.length === 0) {
    return (
      <Shell count={0}>
        <EmptyState
          title="No homes to compare yet"
          description={`Tick "Compare" on any listing to build a shortlist of up to ${MAX_COMPARE} homes, then bring them here side by side.`}
          action={{ label: "Browse listings", href: "/listings" }}
        />
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" size="md" onClick={openPicker}>
            Add from saved homes
          </Button>
        </div>
        <SavedPicker
          key={pickerRun}
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          selected={ids}
          onAdd={(keys) => {
            addManyToCompare(keys);
            setIdsAndUrl([...ids, ...keys].slice(0, MAX_COMPARE));
          }}
        />
      </Shell>
    );
  }

  if (query.isError) {
    return (
      <Shell count={ids.length}>
        <ErrorState description="We couldn't load these listings. Please try again." />
      </Shell>
    );
  }

  const properties = query.data ?? [];

  if (properties.length === 0) {
    return (
      <Shell count={0}>
        <EmptyState
          title="Those listings are no longer available"
          description="They may have been sold or removed from the feed."
          action={{ label: "Browse listings", href: "/listings" }}
        />
      </Shell>
    );
  }

  const removeOne = (id: string) => {
    // Keep the tray and the URL in agreement.
    if (compare.includes(id)) toggleCompare(id);
    setIdsAndUrl(ids.filter((key) => key !== id));
  };

  const clearAll = () => {
    clearCompare();
    setIdsAndUrl([]);
  };

  return (
    <Shell count={properties.length}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-small text-ink-muted">
          {properties.length === 1
            ? "1 home selected"
            : `${properties.length} homes side by side`}
        </p>
        <div className="flex items-center gap-2">
          {ids.length < MAX_COMPARE && (
            <Button variant="secondary" size="sm" onClick={openPicker}>
              Add more
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        </div>
      </div>

      {/* One home is not a comparison, and a single table column stretched the
          photo across the container. Render it as a card with an add slot. */}
      {properties.length === 1 ? (
        <CompareSingle
          property={properties[0]}
          onRemove={removeOne}
          onAdd={openPicker}
        />
      ) : (
        <CompareTable
          properties={properties}
          onRemove={removeOne}
          onAdd={openPicker}
          canAdd={ids.length < MAX_COMPARE}
        />
      )}

      <SavedPicker
        key={pickerRun}
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selected={ids}
        onAdd={(keys) => {
          addManyToCompare(keys);
          setIdsAndUrl([...ids, ...keys].slice(0, MAX_COMPARE));
        }}
      />

      {/* Closing CTA, as in the reference — a comparison usually ends in a
          decision, so offer the obvious next step rather than a dead end. */}
      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <LinkButton variant="secondary" size="md" href="/listings">
          ← Back to listings
        </LinkButton>
        <LinkButton variant="accent" size="md" href="/home-evaluation">
          Get a free home valuation →
        </LinkButton>
      </div>
    </Shell>
  );
}

/**
 * Page chrome: sticky back bar over a tinted canvas.
 *
 * The bar stays put while a wide matrix scrolls, so the way out is always
 * reachable — on a three-home comparison the footer is a long way down.
 */
function Shell({ count, children }: { count: number; children: React.ReactNode }) {
  return (
    <div className="min-h-[60vh] bg-surface-alt">
      <div className="sticky top-0 z-30 border-b border-line bg-surface">
        <div className="container-page flex items-center gap-3 py-3 sm:gap-4">
          <Link
            href="/listings"
            className="flex shrink-0 items-center gap-1.5 text-caption text-ink-muted transition-colors hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path
                d="M14.25 9H3.75M9 14.25 3.75 9 9 3.75"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.5"
              />
            </svg>
            <span className="hidden sm:inline">Back to listings</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <span className="h-4 w-px shrink-0 bg-line" aria-hidden="true" />
          <h1 className="truncate text-h3 text-ink">
            {count === 0
              ? "Compare homes"
              : `Comparing ${count} ${count === 1 ? "home" : "homes"}`}
          </h1>
        </div>
      </div>

      <div className="container-page space-y-4 py-6 sm:py-8">{children}</div>
    </div>
  );
}

function CompareSkeleton({ count }: { count: number }) {
  const columns = Math.min(Math.max(count, 1), MAX_COMPARE);
  return (
    <div className="space-y-3" role="status" aria-label="Loading comparison">
      <div className="flex gap-3">
        <div className="hidden w-[150px] shrink-0 sm:block" />
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-56 flex-1" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <span className="sr-only">Loading comparison…</span>
    </div>
  );
}

/**
 * Picker for pulling saved homes into a comparison.
 *
 * Saved homes are NOT loaded into compare automatically — saving and comparing
 * are different intents — but they are the most likely source of a shortlist,
 * so this makes them one click away.
 */
function SavedPicker({
  open,
  onClose,
  selected,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  selected: string[];
  onAdd: (keys: string[]) => void;
}) {
  const { favorites } = useWatched();
  const available = favorites.filter((key) => !selected.includes(key));
  const room = MAX_COMPARE - selected.length;

  const query = usePropertiesByIds(open ? available : []);
  // The tick list starts empty on every open: the caller remounts this with a
  // `key` tied to the open count, which resets state without an effect.
  const [checked, setChecked] = useState<string[]>([]);

  const toggle = (id: string) =>
    setChecked((prev) =>
      prev.includes(id)
        ? prev.filter((key) => key !== id)
        : prev.length >= room
          ? prev
          : [...prev, id],
    );

  return (
    <Modal open={open} onClose={onClose} title="Add from saved homes">
      {available.length === 0 ? (
        <div className="space-y-4">
          <p className="text-small text-ink-muted">
            {favorites.length === 0
              ? "You haven't saved any homes yet. You can add homes to a comparison straight from the listings page, or save them with the heart first."
              : "All of your saved homes are already in this comparison."}
          </p>
          {/* Without this the dialog is a dead end for anyone with no saved
              homes — it named the next step but offered no way to take it. */}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>
            <LinkButton variant="primary" size="sm" href="/listings">
              Browse listings
            </LinkButton>
          </div>
        </div>
      ) : query.data === undefined && !query.isError ? (
        <div className="space-y-2">
          {Array.from({ length: Math.min(available.length, 4) }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <>
          <p className="mb-3 text-caption text-ink-muted">
            Choose up to {room} more {room === 1 ? "home" : "homes"}.
          </p>
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {(query.data ?? []).map((property) => {
              const isChecked = checked.includes(property.id);
              const blocked = !isChecked && checked.length >= room;
              return (
                <li key={property.id}>
                  <label
                    className={`flex items-center gap-3 rounded-control border p-2 transition-colors ${
                      isChecked ? "border-navy bg-surface-alt" : "border-line"
                    } ${blocked ? "opacity-50" : "cursor-pointer hover:bg-surface-alt"}`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={blocked}
                      onChange={() => toggle(property.id)}
                      className="h-4 w-4 shrink-0 accent-[var(--color-navy)]"
                    />
                    <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-control bg-surface-alt">
                      <SafeImage
                        src={property.image}
                        alt=""
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-small font-medium text-ink">
                        {property.address}
                      </p>
                      <p className="text-caption text-ink-muted">
                        {property.price === null ? EMPTY : formatPrice(property.price)}
                      </p>
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={checked.length === 0}
              onClick={() => {
                onAdd(checked);
                onClose();
              }}
            >
              Add {checked.length > 0 && `(${checked.length})`}
            </Button>
          </div>
        </>
      )}
    </Modal>
  );
}
