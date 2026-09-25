"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import {
  Field,
  Input,
  NumericInput,
  Select,
  SearchInput,
  ChipToggle,
} from "@/components/ui/Field";
import { usePendingNavigation, usePendingSearchParams } from "@/components/navigation/PendingNavigation";
import { SaveSearchButton } from "@/components/search/SaveSearchButton";
import { SEARCH_PROPERTY_TYPES, LISTING_SORTS, RELEVANCE_SORT } from "@/lib/types/domain";
import { formatPrice } from "@/lib/utils/format";
import { formatPostal, looksLikePostal, parsePostalList } from "@/lib/utils/postal";
import { parseListingSearch } from "@/lib/utils/searchParams";

const BED_OPTIONS = [1, 2, 3, 4, 5];
const BATH_OPTIONS = [1, 2, 3, 4];

/** Filters that live in the advanced panel and are applied as one batch. */
const PANEL_KEYS = ["priceMin", "priceMax", "city", "postal", "beds", "baths"] as const;
type PanelKey = (typeof PANEL_KEYS)[number];
type Draft = Record<PanelKey, string>;

/**
 * Every key this component owns — used for "clear all" and the applied count.
 * `postal` is pilled per code (below), so it is counted here but rendered
 * separately; status/openHouse/poly come from the tabs and the map, and are
 * pilled so a filter set elsewhere is never invisible on this page.
 */
const ALL_KEYS = ["ai", "q", "type", "status", "openHouse", "poly", ...PANEL_KEYS] as const;
type FilterKey = (typeof ALL_KEYS)[number];

const EMPTY_DRAFT: Draft = {
  priceMin: "",
  priceMax: "",
  city: "",
  postal: "",
  beds: "",
  baths: "",
};

/** URL `postal=L7A,L6P2K1` → the friendlier "L7A, L6P 2K1" for editing. */
function postalDraft(raw: string | null): string {
  return parsePostalList(raw ?? "").codes.map(formatPostal).join(", ");
}

function draftFromParams(params: URLSearchParams): Draft {
  return {
    priceMin: params.get("priceMin") ?? "",
    priceMax: params.get("priceMax") ?? "",
    city: params.get("city") ?? "",
    postal: postalDraft(params.get("postal")),
    beds: params.get("beds") ?? "",
    baths: params.get("baths") ?? "",
  };
}

function sameDraft(a: Draft, b: Draft) {
  return PANEL_KEYS.every((key) => a[key] === b[key]);
}

/**
 * Listing filter controls.
 *
 * Writes straight to the URL; the server page re-reads and re-queries. Keeping
 * filters in the URL means shareable searches and a working back button, which
 * the reference's local component state could not offer.
 *
 * INTERACTION MODEL — two deliberate tiers, because mixing them is what made
 * the old bar confusing (every control, including a half-typed price, applied
 * itself on blur, so the page re-queried at moments the user never chose):
 *
 *  - Instant: one-tap controls where the choice IS the commit — sort, type
 *    chips, and removing an applied-filter pill. Nothing can be half-entered.
 *  - Deferred: anything typed — the search box and the advanced panel. These
 *    edit a local draft and commit only on an explicit Search / Show homes,
 *    or Enter. Escape or Cancel discards the draft.
 *
 * Applied filters are echoed back as removable pills, so what is in effect is
 * always visible without reopening the panel.
 */
export function ListingFilters({ resultCount }: { resultCount: number }) {
  // The URL being navigated to, so chips and pills change on click rather
  // than when the server answers (PendingNavigation).
  const { navigate } = usePendingNavigation();
  const params = usePendingSearchParams();

  const urlQuery = params.get("q") ?? "";
  const [search, setSearch] = useState(urlQuery);
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFromParams(params));
  const [postalError, setPostalError] = useState<string | null>(null);

  // Re-sync local state when navigation changes the URL (back button, pills,
  // nav links). Done during render so no frame shows a stale value.
  const paramKey = params.toString();
  const [lastParamKey, setLastParamKey] = useState(paramKey);
  if (paramKey !== lastParamKey) {
    setLastParamKey(paramKey);
    setSearch(urlQuery);
    setDraft(draftFromParams(params));
    setPostalError(null);
  }

  const dirty = !sameDraft(draft, draftFromParams(params));

  // Escape closes the panel and discards the draft — the standard escape hatch
  // for a surface holding uncommitted edits.
  useEffect(() => {
    if (!expanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDraft(draftFromParams(params));
      setExpanded(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expanded, params]);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    // Any filter change returns to page 1; staying on page 5 of a new result
    // set is the classic filtered-pagination bug.
    next.delete("page");
    navigate(`/listings?${next.toString()}`);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = search.trim();
    // "L7A" or "L7A 3K9" typed into the free-text box is a postal search. As
    // text it would only match address strings; as `postal` it is an exact
    // FSA/code filter, and it adds to any codes already applied.
    if (term && looksLikePostal(term)) {
      const codes = parsePostalList(`${params.get("postal") ?? ""},${term}`).codes;
      update({ postal: codes.join(","), q: null });
      return;
    }
    update({ q: term || null });
  };

  const applyPanel = () => {
    // Swap a reversed range instead of silently returning zero results.
    let { priceMin, priceMax } = draft;
    const lo = Number(priceMin);
    const hi = Number(priceMax);
    if (priceMin && priceMax && Number.isFinite(lo) && Number.isFinite(hi) && lo > hi) {
      [priceMin, priceMax] = [priceMax, priceMin];
    }

    // Reject the batch rather than silently dropping a mistyped code: a search
    // for "L7A, L6O" that quietly became "L7A" would look like the whole answer.
    const postal = parsePostalList(draft.postal);
    if (postal.invalid.length > 0) {
      setPostalError(
        `Not a valid postal code: ${postal.invalid.join(", ")}. Use L7A or L7A 3K9.`,
      );
      return;
    }
    setPostalError(null);

    update({
      priceMin: priceMin || null,
      priceMax: priceMax || null,
      city: draft.city.trim() || null,
      postal: postal.codes.join(",") || null,
      beds: draft.beds || null,
      baths: draft.baths || null,
    });
    setExpanded(false);
  };

  const cancelPanel = () => {
    setDraft(draftFromParams(params));
    setPostalError(null);
    setExpanded(false);
  };

  // `type=Rental` is the legacy spelling of Rent (see parseListingParams): it
  // lights the Rent toggle, and is neither a type chip nor a pill.
  const legacyRent = params.get("type") === "Rental";
  const isRent = params.get("tx") === "rent" || legacyRent;
  const activeType = legacyRent ? null : params.get("type");
  const appliedKeys = ALL_KEYS.filter((key) => params.get(key) && !(key === "type" && legacyRent));
  const setRent = (rent: boolean) => {
    if (rent === isRent) return;
    update({
      tx: rent ? "rent" : null,
      type: legacyRent ? null : activeType,
      // Sale prices and monthly rents share the price params; a band set for
      // one is meaningless for the other.
      priceMin: null,
      priceMax: null,
    });
  };
  const postalCodes = parsePostalList(params.get("postal") ?? "").codes;
  const removePostal = (code: string) =>
    update({ postal: postalCodes.filter((c) => c !== code).join(",") || null });

  return (
    <div className="space-y-4">
      {/* Row 1 — search, sort, filters trigger. */}
      <div className="flex flex-wrap items-center gap-3">
        <form onSubmit={submitSearch} className="flex min-w-[280px] flex-1 items-center gap-2">
          <SearchInput
            label="Search by address, city, postal code or MLS number"
            value={search}
            onValueChange={setSearch}
            placeholder="Address, city, postal code (L7A) or MLS…"
            className="flex-1"
          />
          {/* An explicit button is the point: the old bar searched on blur, so
              the trigger was invisible. Enter still submits the same form. */}
          <Button type="submit" variant="primary" size="md" className="shrink-0">
            Search
          </Button>
        </form>

        <Select
          aria-label="Sort listings"
          className="w-auto min-w-[180px]"
          value={params.get("sort") ?? (params.get("ai") ? RELEVANCE_SORT.value : "newest")}
          onChange={(event) => update({ sort: event.target.value })}
        >
          {/* "Best match" ranks by the AI search's preferences, so it only
              exists while they are applied. */}
          {(params.get("ai") ? [RELEVANCE_SORT, ...LISTING_SORTS] : LISTING_SORTS).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>

        <Button
          variant="secondary"
          size="md"
          aria-expanded={expanded}
          aria-controls="listing-filter-panel"
          onClick={() => (expanded ? cancelPanel() : setExpanded(true))}
        >
          Filters
          {appliedKeys.length > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-navy px-1.5 text-[11px] font-semibold text-white">
              {appliedKeys.length}
            </span>
          )}
        </Button>

        <SaveSearchButton query={parseListingSearch(params)} />
      </div>

      {/* Row 2 — Buy/Rent, then type chips. One tap is one commit, so these
          stay instant. */}
      <div className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Buy or rent" className="flex gap-2">
          <ChipToggle active={!isRent} onClick={() => setRent(false)}>
            Buy
          </ChipToggle>
          <ChipToggle active={isRent} onClick={() => setRent(true)}>
            Rent
          </ChipToggle>
        </div>
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-line" />
        <span className="text-caption text-ink-muted">Type:</span>
        <ChipToggle active={!activeType} onClick={() => update({ type: null })}>
          All
        </ChipToggle>
        {SEARCH_PROPERTY_TYPES.map((type) => (
          <ChipToggle
            key={type}
            active={activeType === type}
            onClick={() => update({ type: activeType === type ? null : type })}
          >
            {type}
          </ChipToggle>
        ))}
      </div>

      {/* Row 3 — what is actually in effect, each removable in one tap. */}
      {appliedKeys.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-caption text-ink-muted">Applied:</span>
          {postalCodes.map((code) => (
            <FilterPill
              key={`postal-${code}`}
              label={formatPostal(code)}
              icon={<PinIcon />}
              onRemove={() => removePostal(code)}
            />
          ))}
          {appliedKeys
            .filter((key) => key !== "postal")
            .map((key) => (
              <FilterPill
                key={key}
                label={pillLabel(key, params)}
                onRemove={() => update({ [key]: null })}
              />
            ))}
          <button
            type="button"
            // Clearing filters keeps you on the side (Buy/Rent) you were on.
            onClick={() => navigate(isRent ? "/listings?tx=rent" : "/listings")}
            className="text-caption font-medium text-ink-muted underline underline-offset-2 transition-colors hover:text-ink"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Advanced panel — a draft that commits as one batch. */}
      {expanded && (
        <div
          id="listing-filter-panel"
          className="rounded-surface border border-line bg-surface-alt p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label={isRent ? "Min rent / month" : "Min price"} htmlFor="filter-price-min">
              <NumericInput
                id="filter-price-min"
                min={0}
                max={100000000}
                placeholder="No min"
                value={draft.priceMin}
                onChange={(event) =>
                  setDraft((d) => ({ ...d, priceMin: event.target.value }))
                }
              />
            </Field>

            <Field label={isRent ? "Max rent / month" : "Max price"} htmlFor="filter-price-max">
              <NumericInput
                id="filter-price-max"
                min={0}
                max={100000000}
                placeholder="No max"
                value={draft.priceMax}
                onChange={(event) =>
                  setDraft((d) => ({ ...d, priceMax: event.target.value }))
                }
              />
            </Field>

            <Field label="City" htmlFor="filter-city">
              <Input
                id="filter-city"
                placeholder="e.g. Toronto"
                value={draft.city}
                onChange={(event) => setDraft((d) => ({ ...d, city: event.target.value }))}
              />
            </Field>

            <Field
              label="Postal code"
              htmlFor="filter-postal"
              hint="L7A or L7A 3K9 — separate several with commas"
              error={postalError}
            >
              <Input
                id="filter-postal"
                placeholder="e.g. L7A, L6P 2K1"
                autoCapitalize="characters"
                autoComplete="postal-code"
                value={draft.postal}
                aria-invalid={postalError ? true : undefined}
                aria-describedby={postalError ? "filter-postal-error" : "filter-postal-hint"}
                onChange={(event) => {
                  setPostalError(null);
                  setDraft((d) => ({ ...d, postal: event.target.value }));
                }}
              />
            </Field>

            <div className="space-y-1.5">
              <span className="block text-small font-medium text-ink">Bedrooms</span>
              <div className="flex flex-wrap gap-2">
                <ChipToggle
                  active={!draft.beds}
                  onClick={() => setDraft((d) => ({ ...d, beds: "" }))}
                >
                  Any
                </ChipToggle>
                {BED_OPTIONS.map((beds) => (
                  <ChipToggle
                    key={beds}
                    active={draft.beds === String(beds)}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        beds: d.beds === String(beds) ? "" : String(beds),
                      }))
                    }
                  >
                    {beds}+
                  </ChipToggle>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="block text-small font-medium text-ink">Bathrooms</span>
              <div className="flex flex-wrap gap-2">
                <ChipToggle
                  active={!draft.baths}
                  onClick={() => setDraft((d) => ({ ...d, baths: "" }))}
                >
                  Any
                </ChipToggle>
                {BATH_OPTIONS.map((baths) => (
                  <ChipToggle
                    key={baths}
                    active={draft.baths === String(baths)}
                    onClick={() =>
                      setDraft((d) => ({
                        ...d,
                        baths: d.baths === String(baths) ? "" : String(baths),
                      }))
                    }
                  >
                    {baths}+
                  </ChipToggle>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-line pt-4">
            <p className="flex-1 text-caption text-ink-muted" aria-live="polite">
              {dirty
                ? "Set as many filters as you like, then apply them together."
                : `${resultCount.toLocaleString("en-CA")} matching ${resultCount === 1 ? "home" : "homes"}`}
            </p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDraft(EMPTY_DRAFT)}
              disabled={sameDraft(draft, EMPTY_DRAFT)}
            >
              Reset
            </Button>
            <Button variant="secondary" size="sm" onClick={cancelPanel}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={applyPanel}>
              {dirty ? "Show homes" : "Done"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** Human-readable summary of one applied filter, for the pill row. */
function pillLabel(key: FilterKey, params: URLSearchParams): string {
  const value = params.get(key) ?? "";
  switch (key) {
    case "ai":
      return `Like: ${value}`;
    case "q":
      return `"${value}"`;
    case "beds":
      return `${value}+ beds`;
    case "baths":
      return `${value}+ baths`;
    case "priceMin":
      return `Min ${formatPrice(Number(value))}`;
    case "priceMax":
      return `Max ${formatPrice(Number(value))}`;
    case "openHouse":
      return "Open house";
    case "poly":
      return "Drawn area";
    default:
      return value;
  }
}

function PinIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="text-ink-muted">
      <path
        d="M9 16.5s5.25-4.5 5.25-9a5.25 5.25 0 1 0-10.5 0c0 4.5 5.25 9 5.25 9Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="7.5" r="1.9" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function FilterPill({
  label,
  icon,
  onRemove,
}: {
  label: string;
  icon?: ReactNode;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-line bg-surface py-1 pl-3 pr-1 text-caption text-ink">
      {icon}
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter ${label}`}
        className="flex h-5 w-5 items-center justify-center rounded-full text-ink-subtle transition-colors hover:bg-surface-alt hover:text-ink"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d="M18 6 6 18M6 6l12 12"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </span>
  );
}
