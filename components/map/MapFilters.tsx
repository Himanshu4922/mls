"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { ChipToggle, Field, Input, NumericInput, Select } from "@/components/ui/Field";
import { AiSearchBox } from "@/components/search/AiSearchBox";
import {
  LISTING_SORTS,
  RELEVANCE_SORT,
  SEARCH_PROPERTY_TYPES,
  type ListingQuery,
  type ListingSort,
} from "@/lib/types/domain";
import { formatNumber, formatPrice } from "@/lib/utils/format";
import { formatPostal } from "@/lib/utils/postal";
import { STATUS_TABS } from "@/lib/utils/status";

/**
 * Map search filters, sized for the map's sidebar.
 *
 * They read and write the same ListingQuery (and so the same URL params) as
 * /listings, so a search moves between the two views intact. The interaction
 * model matches <ListingFilters>:
 *
 *  - Instant: Buy/Rent, sort, type chips and removing a pill. One tap is the
 *    whole decision, so it applies at once.
 *  - Deferred: the panel. Typed values edit a draft and apply together on
 *    "Show homes" (or Enter), so the map never refetches for a half-typed
 *    price. Escape or Cancel discards the draft.
 *
 * The bar and the panel are separate components: the panel takes the list's
 * place while open, so on a phone it gets the whole half-screen sidebar
 * instead of being squeezed above the results.
 */

const BED_OPTIONS = [1, 2, 3, 4, 5];
const BATH_OPTIONS = [1, 2, 3, 4];
const YEAR_OPTIONS = [2020, 2010, 2000, 1990, 1980];

type OnQueryChange = (next: ListingQuery) => void;

interface Draft {
  search: string;
  priceMin: string;
  priceMax: string;
  beds: string;
  baths: string;
  sqftMin: string;
  sqftMax: string;
  yearBuiltMin: string;
  status: string;
  openHouse: boolean;
}

const EMPTY_DRAFT: Draft = {
  search: "",
  priceMin: "",
  priceMax: "",
  beds: "",
  baths: "",
  sqftMin: "",
  sqftMax: "",
  yearBuiltMin: "",
  status: "",
  openHouse: false,
};

const str = (value: number | undefined) => (value ? String(value) : "");
const num = (value: string) => (value ? Number(value) : undefined);

function draftFromQuery(query: ListingQuery): Draft {
  return {
    search: query.search ?? "",
    priceMin: str(query.priceMin),
    priceMax: str(query.priceMax),
    beds: str(query.bedsMin),
    baths: str(query.bathsMin),
    sqftMin: str(query.sqftMin),
    sqftMax: str(query.sqftMax),
    yearBuiltMin: str(query.yearBuiltMin),
    status: query.status ?? "",
    openHouse: Boolean(query.openHouse),
  };
}

function sameDraft(a: Draft, b: Draft) {
  return (Object.keys(a) as Array<keyof Draft>).every((key) => a[key] === b[key]);
}

/** A reversed range is swapped rather than silently returning nothing. */
function orderedRange(lo: string, hi: string): [number | undefined, number | undefined] {
  const min = num(lo);
  const max = num(hi);
  return min !== undefined && max !== undefined && min > max ? [max, min] : [min, max];
}

/** How many panel filters are in effect, for the Filters button's badge. */
export function countPanelFilters(query: ListingQuery): number {
  return [
    query.search,
    query.priceMin,
    query.priceMax,
    query.bedsMin,
    query.bathsMin,
    query.sqftMin,
    query.sqftMax,
    query.yearBuiltMin,
    query.status,
    query.openHouse,
  ].filter(Boolean).length;
}

/**
 * Everything cleared except where and how you are looking: Buy/Rent, the drawn
 * area and the sort survive, since none of them is a "filter" to the user.
 */
function clearedQuery(query: ListingQuery): ListingQuery {
  return { transaction: query.transaction, polygon: query.polygon, sort: query.sort };
}

// ---------------------------------------------------------------------------

export function MapFilterBar({
  query,
  onChange,
  panelOpen,
  onTogglePanel,
}: {
  query: ListingQuery;
  onChange: OnQueryChange;
  panelOpen: boolean;
  onTogglePanel: () => void;
}) {
  const rent = query.transaction === "rent";
  const panelCount = countPanelFilters(query);

  const setRent = (next: boolean) => {
    if (next === rent) return;
    // Sale prices and monthly rents share the price params; a band set for one
    // is meaningless for the other.
    onChange({
      ...query,
      transaction: next ? "rent" : "sale",
      priceMin: undefined,
      priceMax: undefined,
    });
  };

  const pills = appliedPills(query, onChange);

  return (
    <div className="space-y-3">
      <AiSearchBox variant="inline" basePath="/map-search" current={query} />
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Buy or rent" className="flex gap-1.5">
          <ChipToggle active={!rent} onClick={() => setRent(false)}>
            Buy
          </ChipToggle>
          <ChipToggle active={rent} onClick={() => setRent(true)}>
            Rent
          </ChipToggle>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Select
            aria-label="Sort listings"
            className="h-9 w-auto min-w-[150px] text-caption"
            value={query.sort ?? "newest"}
            onChange={(event) => onChange({ ...query, sort: event.target.value as ListingSort })}
          >
            {(query.semantic ? [RELEVANCE_SORT, ...LISTING_SORTS] : LISTING_SORTS).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Button
            variant={panelOpen ? "primary" : "secondary"}
            size="sm"
            aria-expanded={panelOpen}
            aria-controls="map-filter-panel"
            onClick={onTogglePanel}
          >
            <FilterIcon />
            Filters
            {panelCount > 0 && (
              <span
                className={
                  panelOpen
                    ? "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-white px-1.5 text-[11px] font-semibold text-navy"
                    : "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-navy px-1.5 text-[11px] font-semibold text-white"
                }
              >
                {panelCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Type chips scroll sideways rather than wrapping into three rows in a
          narrow sidebar. */}
      <div
        role="group"
        aria-label="Property type"
        className="-mx-5 flex gap-1.5 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        <ChipToggle
          active={!query.type}
          onClick={() => onChange({ ...query, type: undefined })}
          className="shrink-0"
        >
          All types
        </ChipToggle>
        {SEARCH_PROPERTY_TYPES.map((type) => (
          <ChipToggle
            key={type}
            active={query.type === type}
            onClick={() => onChange({ ...query, type: query.type === type ? undefined : type })}
            className="shrink-0"
          >
            {type}
          </ChipToggle>
        ))}
      </div>

      {pills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {pills}
          <button
            type="button"
            onClick={() => onChange(clearedQuery(query))}
            className="ml-1 text-caption font-medium text-ink-muted underline underline-offset-2 transition-colors hover:text-ink"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

/** Every applied filter the chips above do not already show, each removable. */
function appliedPills(query: ListingQuery, onChange: OnQueryChange): ReactNode[] {
  const pills: ReactNode[] = [];
  const add = (key: string, label: string, next: Partial<ListingQuery>) =>
    pills.push(<FilterPill key={key} label={label} onRemove={() => onChange({ ...query, ...next })} />);
  const rent = query.transaction === "rent";
  const money = (value: number) => (rent ? `${formatPrice(value)}/mo` : formatPrice(value));

  if (query.semantic) {
    add("ai", `Like: ${query.semantic}`, {
      semantic: undefined,
      sort: query.sort === "relevance" ? "newest" : query.sort,
    });
  }
  if (query.search) add("q", `"${query.search}"`, { search: undefined });
  // City and postal are set from /listings; the map has no field for them, so
  // the pill is the only place they can be seen and removed here.
  if (query.city) add("city", query.city, { city: undefined });
  for (const code of query.postalCodes ?? []) {
    const rest = query.postalCodes!.filter((c) => c !== code);
    add(`postal-${code}`, formatPostal(code), { postalCodes: rest.length ? rest : undefined });
  }
  if (query.priceMin && query.priceMax) {
    add("price", `${money(query.priceMin)} – ${money(query.priceMax)}`, {
      priceMin: undefined,
      priceMax: undefined,
    });
  } else if (query.priceMin) {
    add("priceMin", `From ${money(query.priceMin)}`, { priceMin: undefined });
  } else if (query.priceMax) {
    add("priceMax", `Up to ${money(query.priceMax)}`, { priceMax: undefined });
  }
  if (query.bedsMin) add("beds", `${query.bedsMin}+ beds`, { bedsMin: undefined });
  if (query.bathsMin) add("baths", `${query.bathsMin}+ baths`, { bathsMin: undefined });
  if (query.sqftMin || query.sqftMax) {
    const lo = query.sqftMin ? formatNumber(query.sqftMin) : "0";
    const label = query.sqftMax
      ? `${lo} – ${formatNumber(query.sqftMax)} sq ft`
      : `${lo}+ sq ft`;
    add("sqft", label, { sqftMin: undefined, sqftMax: undefined });
  }
  if (query.yearBuiltMin) add("year", `Built ${query.yearBuiltMin}+`, { yearBuiltMin: undefined });
  if (query.status) add("status", statusLabel(query.status, rent), { status: undefined });
  if (query.openHouse) add("openHouse", "Open house", { openHouse: undefined });
  if (query.polygon?.length) add("poly", "Drawn area", { polygon: undefined });
  return pills;
}

function statusLabel(status: string, rent: boolean): string {
  const tab = STATUS_TABS.find((t) => t.param.toLowerCase() === status.toLowerCase());
  if (!tab) return status;
  if (rent && tab.group === "active") return "For Lease";
  if (rent && tab.group === "sold") return "Leased";
  return tab.label;
}

// ---------------------------------------------------------------------------

export function MapFilterPanel({
  query,
  onChange,
  onClose,
}: {
  query: ListingQuery;
  onChange: OnQueryChange;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => draftFromQuery(query));
  const applied = draftFromQuery(query);
  const dirty = !sameDraft(draft, applied);
  const rent = query.transaction === "rent";

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));
  /** Tapping the selected chip again clears it. */
  const toggle = (key: "beds" | "baths" | "yearBuiltMin" | "status", value: string) =>
    setDraft((d) => ({ ...d, [key]: d[key] === value ? "" : value }));

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const apply = (event?: FormEvent) => {
    event?.preventDefault();
    const [priceMin, priceMax] = orderedRange(draft.priceMin, draft.priceMax);
    const [sqftMin, sqftMax] = orderedRange(draft.sqftMin, draft.sqftMax);
    onChange({
      ...query,
      search: draft.search.trim() || undefined,
      priceMin,
      priceMax,
      bedsMin: num(draft.beds),
      bathsMin: num(draft.baths),
      sqftMin,
      sqftMax,
      yearBuiltMin: num(draft.yearBuiltMin),
      status: draft.status || undefined,
      openHouse: draft.openHouse || undefined,
    });
    onClose();
  };

  return (
    <form
      id="map-filter-panel"
      aria-label="Filters"
      onSubmit={apply}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
        <Field label="Keyword" htmlFor="map-filter-q" hint="Address, street, MLS® number or feature">
          <Input
            id="map-filter-q"
            placeholder="e.g. King St, pool, W1234567"
            value={draft.search}
            onChange={(event) => set("search", event.target.value)}
          />
        </Field>

        <fieldset>
          <legend className="text-small font-medium text-ink">
            {rent ? "Monthly rent" : "Price"}
          </legend>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            <NumericInput
              aria-label={rent ? "Minimum rent per month" : "Minimum price"}
              min={0}
              max={100000000}
              placeholder="No min"
              value={draft.priceMin}
              onChange={(event) => set("priceMin", event.target.value)}
            />
            <NumericInput
              aria-label={rent ? "Maximum rent per month" : "Maximum price"}
              min={0}
              max={100000000}
              placeholder="No max"
              value={draft.priceMax}
              onChange={(event) => set("priceMax", event.target.value)}
            />
          </div>
        </fieldset>

        <ChipGroup label="Bedrooms">
          <ChipToggle active={!draft.beds} onClick={() => set("beds", "")}>
            Any
          </ChipToggle>
          {BED_OPTIONS.map((beds) => (
            <ChipToggle
              key={beds}
              active={draft.beds === String(beds)}
              onClick={() => toggle("beds", String(beds))}
            >
              {beds}+
            </ChipToggle>
          ))}
        </ChipGroup>

        <ChipGroup label="Bathrooms">
          <ChipToggle active={!draft.baths} onClick={() => set("baths", "")}>
            Any
          </ChipToggle>
          {BATH_OPTIONS.map((baths) => (
            <ChipToggle
              key={baths}
              active={draft.baths === String(baths)}
              onClick={() => toggle("baths", String(baths))}
            >
              {baths}+
            </ChipToggle>
          ))}
        </ChipGroup>

        <fieldset>
          <legend className="text-small font-medium text-ink">Size (sq ft)</legend>
          <div className="mt-1.5 grid grid-cols-2 gap-3">
            <NumericInput
              aria-label="Minimum square feet"
              min={0}
              max={100000}
              placeholder="No min"
              value={draft.sqftMin}
              onChange={(event) => set("sqftMin", event.target.value)}
            />
            <NumericInput
              aria-label="Maximum square feet"
              min={0}
              max={100000}
              placeholder="No max"
              value={draft.sqftMax}
              onChange={(event) => set("sqftMax", event.target.value)}
            />
          </div>
        </fieldset>

        <ChipGroup label="Year built">
          <ChipToggle active={!draft.yearBuiltMin} onClick={() => set("yearBuiltMin", "")}>
            Any
          </ChipToggle>
          {YEAR_OPTIONS.map((year) => (
            <ChipToggle
              key={year}
              active={draft.yearBuiltMin === String(year)}
              onClick={() => toggle("yearBuiltMin", String(year))}
            >
              {year}+
            </ChipToggle>
          ))}
        </ChipGroup>

        <ChipGroup label="Listing status">
          <ChipToggle active={!draft.status} onClick={() => set("status", "")}>
            All
          </ChipToggle>
          {STATUS_TABS.map((tab) => (
            <ChipToggle
              key={tab.param}
              active={draft.status.toLowerCase() === tab.param.toLowerCase()}
              onClick={() => toggle("status", tab.param)}
            >
              {statusLabel(tab.param, rent)}
            </ChipToggle>
          ))}
        </ChipGroup>

        <ChipGroup label="Open house">
          <ChipToggle active={draft.openHouse} onClick={() => set("openHouse", !draft.openHouse)}>
            Has an upcoming open house
          </ChipToggle>
        </ChipGroup>
      </div>

      <footer className="flex items-center gap-2 border-t border-line bg-surface-alt px-5 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setDraft(EMPTY_DRAFT)}
          disabled={sameDraft(draft, EMPTY_DRAFT)}
        >
          Reset
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            {dirty ? "Show homes" : "Done"}
          </Button>
        </div>
      </footer>
    </form>
  );
}

function ChipGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <p className="text-small font-medium text-ink">{label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface py-0.5 pl-2.5 pr-0.5 text-caption text-ink">
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-alt hover:text-ink"
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </button>
    </span>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M2.25 4.5h13.5M4.5 9h9M7.5 13.5h3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
