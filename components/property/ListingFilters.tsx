"use client";

import {
  useEffect,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react";
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
import { AiSearchBox } from "@/components/search/AiSearchBox";
import { SaveSearchButton } from "@/components/search/SaveSearchButton";
import { SideSheet } from "@/components/ui/SideSheet";
import { SEARCH_PROPERTY_TYPES, LISTING_SORTS, RELEVANCE_SORT } from "@/lib/types/domain";
import type { ListingQuery } from "@/lib/types/domain";
import { formatPrice } from "@/lib/utils/format";
import { formatPostal, looksLikePostal, parsePostalList } from "@/lib/utils/postal";
import { parseListingSearch } from "@/lib/utils/searchParams";

const BED_OPTIONS = [1, 2, 3, 4, 5];
const BATH_OPTIONS = [1, 2, 3, 4];
const GARAGE_OPTIONS = [1, 2, 3];
const FLOOR_OPTIONS = [1, 2, 3];
const YEAR_OPTIONS = [2020, 2010, 2000, 1990, 1980];

const BASEMENT_OPTIONS: Array<{ value: "" | NonNullable<ListingQuery["basement"]>; label: string }> = [
  { value: "", label: "Any" },
  { value: "yes", label: "Yes" },
  { value: "finished", label: "Finished" },
  { value: "unfinished", label: "Unfinished" },
  { value: "apartment", label: "Apartment / walk-out" },
];

/** Filters drafted in the sheet and applied as one batch. */
const PANEL_KEYS = [
  "priceMin",
  "priceMax",
  "city",
  "postal",
  "beds",
  "baths",
  "garages",
  "floors",
  "basement",
  "yearBuiltMin",
] as const;
type PanelKey = (typeof PANEL_KEYS)[number];
type Draft = Record<PanelKey, string>;

/**
 * Keys that count toward the Filters badge / applied pills. Sort stays in the
 * sheet but is not a "filter" pill of its own.
 */
const ALL_KEYS = [
  "ai",
  "q",
  "type",
  "status",
  "openHouse",
  "poly",
  ...PANEL_KEYS,
] as const;
type FilterKey = (typeof ALL_KEYS)[number];

const EMPTY_DRAFT: Draft = {
  priceMin: "",
  priceMax: "",
  city: "",
  postal: "",
  beds: "",
  baths: "",
  garages: "",
  floors: "",
  basement: "",
  yearBuiltMin: "",
};

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
    garages: params.get("garages") ?? "",
    floors: params.get("floors") ?? "",
    basement: params.get("basement") ?? "",
    yearBuiltMin: params.get("yearBuiltMin") ?? "",
  };
}

function sameDraft(a: Draft, b: Draft) {
  return PANEL_KEYS.every((key) => a[key] === b[key]);
}

/**
 * Clean listings chrome + right-side filter sheet.
 *
 * On the page itself: keyword search, Buy/Rent, and a Filters button.
 * Everything else (AI search, type, sort, save search, advanced filters) lives
 * in the sheet so the results stay above the fold and the bar stays simple.
 */
export function ListingFilters({ resultCount }: { resultCount: number }) {
  const { navigate } = usePendingNavigation();
  const params = usePendingSearchParams();

  const urlQuery = params.get("q") ?? "";
  const [search, setSearch] = useState(urlQuery);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFromParams(params));
  const [postalError, setPostalError] = useState<string | null>(null);

  const paramKey = params.toString();
  const [lastParamKey, setLastParamKey] = useState(paramKey);
  if (paramKey !== lastParamKey) {
    setLastParamKey(paramKey);
    setSearch(urlQuery);
    setDraft(draftFromParams(params));
    setPostalError(null);
  }

  const dirty = !sameDraft(draft, draftFromParams(params));

  useEffect(() => {
    if (!sheetOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // SideSheet also handles Escape; this keeps the draft in sync if the
      // sheet closes via its own handler first.
      if (event.key !== "Escape") return;
      setDraft(draftFromParams(params));
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sheetOpen, params]);

  const update = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") next.delete(key);
      else next.set(key, value);
    }
    next.delete("page");
    navigate(`/listings?${next.toString()}`);
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = search.trim();
    if (term && looksLikePostal(term)) {
      const codes = parsePostalList(`${params.get("postal") ?? ""},${term}`).codes;
      update({ postal: codes.join(","), q: null });
      return;
    }
    update({ q: term || null });
  };

  const openSheet = () => {
    setDraft(draftFromParams(params));
    setPostalError(null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setDraft(draftFromParams(params));
    setPostalError(null);
    setSheetOpen(false);
  };

  const applySheet = () => {
    let { priceMin, priceMax } = draft;
    const lo = Number(priceMin);
    const hi = Number(priceMax);
    if (priceMin && priceMax && Number.isFinite(lo) && Number.isFinite(hi) && lo > hi) {
      [priceMin, priceMax] = [priceMax, priceMin];
    }

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
      garages: draft.garages || null,
      floors: draft.floors || null,
      basement: draft.basement || null,
      yearBuiltMin: draft.yearBuiltMin || null,
    });
    setSheetOpen(false);
  };

  const legacyRent = params.get("type") === "Rental";
  const isRent = params.get("tx") === "rent" || legacyRent;
  const activeType = legacyRent ? null : params.get("type");
  const appliedKeys = ALL_KEYS.filter((key) => params.get(key) && !(key === "type" && legacyRent));
  // Badge counts sheet-owned filters (not the free-text `q` already on the bar).
  const sheetFilterCount = appliedKeys.filter((key) => key !== "q").length;

  const setRent = (rent: boolean) => {
    if (rent === isRent) return;
    update({
      tx: rent ? "rent" : null,
      type: legacyRent ? null : activeType,
      priceMin: null,
      priceMax: null,
    });
  };

  const postalCodes = parsePostalList(params.get("postal") ?? "").codes;
  const removePostal = (code: string) =>
    update({ postal: postalCodes.filter((c) => c !== code).join(",") || null });

  const listingQuery = parseListingSearch(params);

  return (
    <div className="space-y-3">
      {/* Simple bar: search + Buy/Rent + Filters. */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <form
          onSubmit={submitSearch}
          className="flex min-w-0 flex-[1_1_100%] items-center gap-2 sm:min-w-[280px] sm:flex-[1_1_auto]"
        >
          <SearchInput
            label="Search by address, city, postal code or MLS number"
            value={search}
            onValueChange={setSearch}
            placeholder="Address, city, postal code or MLS…"
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="primary" size="md" className="shrink-0">
            Search
          </Button>
        </form>

        <div role="group" aria-label="Buy or rent" className="flex shrink-0 gap-2">
          <ChipToggle active={!isRent} onClick={() => setRent(false)}>
            Buy
          </ChipToggle>
          <ChipToggle active={isRent} onClick={() => setRent(true)}>
            Rent
          </ChipToggle>
        </div>

        <Button
          variant="secondary"
          size="md"
          aria-expanded={sheetOpen}
          aria-controls="listing-filter-sheet"
          onClick={openSheet}
          className="shrink-0"
        >
          <FilterIcon />
          <span className="ml-1.5">Filters</span>
          {sheetFilterCount > 0 && (
            <span className="ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-navy px-1.5 text-[11px] font-semibold text-white">
              {sheetFilterCount}
            </span>
          )}
        </Button>
      </div>

      {/* Applied filters stay visible so the sheet isn't the only place to see them. */}
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
            onClick={() => navigate(isRent ? "/listings?tx=rent" : "/listings")}
            className="text-caption font-medium text-ink-muted underline underline-offset-2 transition-colors hover:text-ink"
          >
            Clear all
          </button>
        </div>
      )}

      <SideSheet
        open={sheetOpen}
        onClose={closeSheet}
        title="Filters & tools"
        description="AI search, home type, sort and detailed filters."
        footer={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="md"
              className="shrink-0"
              onClick={() => setDraft(EMPTY_DRAFT)}
              disabled={sameDraft(draft, EMPTY_DRAFT)}
            >
              Reset
            </Button>
            <Button variant="secondary" size="md" className="flex-1" onClick={closeSheet}>
              Cancel
            </Button>
            <Button variant="primary" size="md" className="flex-1" onClick={applySheet}>
              {dirty ? "Show homes" : "Done"}
            </Button>
          </div>
        }
      >
        <div id="listing-filter-sheet" className="space-y-8">
          <section className="space-y-3">
            <AiSearchBox
              variant="panel"
              current={listingQuery}
              onSearched={closeSheet}
            />
          </section>

          <section className="space-y-3 border-t border-line pt-6">
            <h3 className="text-small font-semibold text-ink">Home type</h3>
            <div className="flex flex-wrap gap-2">
              <ChipToggle
                active={!activeType}
                onClick={() => update({ type: null })}
              >
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
          </section>

          <section className="space-y-3 border-t border-line pt-6">
            <Field label="Sort by" htmlFor="sheet-sort">
              <Select
                id="sheet-sort"
                aria-label="Sort listings"
                value={params.get("sort") ?? (params.get("ai") ? RELEVANCE_SORT.value : "newest")}
                onChange={(event) => update({ sort: event.target.value })}
              >
                {(params.get("ai") ? [RELEVANCE_SORT, ...LISTING_SORTS] : LISTING_SORTS).map(
                  (option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ),
                )}
              </Select>
            </Field>
            <SaveSearchButton query={listingQuery} className="w-full justify-center" />
          </section>

          <section className="space-y-4 border-t border-line pt-6">
            <div>
              <h3 className="text-small font-semibold text-ink">Details</h3>
              <p className="mt-1 text-caption text-ink-muted">
                {dirty
                  ? "Change as many as you like, then tap Show homes."
                  : `${resultCount.toLocaleString("en-CA")} matching ${resultCount === 1 ? "home" : "homes"}`}
              </p>
            </div>
            <FilterFields
              draft={draft}
              setDraft={setDraft}
              isRent={isRent}
              postalError={postalError}
              clearPostalError={() => setPostalError(null)}
            />
          </section>
        </div>
      </SideSheet>
    </div>
  );
}

function FilterFields({
  draft,
  setDraft,
  isRent,
  postalError,
  clearPostalError,
}: {
  draft: Draft;
  setDraft: Dispatch<SetStateAction<Draft>>;
  isRent: boolean;
  postalError: string | null;
  clearPostalError: () => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4">
      <Field label={isRent ? "Min rent / month" : "Min price"} htmlFor="sheet-price-min">
        <NumericInput
          id="sheet-price-min"
          min={0}
          max={100000000}
          placeholder="No min"
          value={draft.priceMin}
          onChange={(event) => setDraft((d) => ({ ...d, priceMin: event.target.value }))}
        />
      </Field>

      <Field label={isRent ? "Max rent / month" : "Max price"} htmlFor="sheet-price-max">
        <NumericInput
          id="sheet-price-max"
          min={0}
          max={100000000}
          placeholder="No max"
          value={draft.priceMax}
          onChange={(event) => setDraft((d) => ({ ...d, priceMax: event.target.value }))}
        />
      </Field>

      <Field label="City" htmlFor="sheet-city">
        <Input
          id="sheet-city"
          placeholder="e.g. Toronto"
          value={draft.city}
          onChange={(event) => setDraft((d) => ({ ...d, city: event.target.value }))}
        />
      </Field>

      <Field
        label="Postal code"
        htmlFor="sheet-postal"
        hint="L7A or L7A 3K9 — separate several with commas"
        error={postalError}
      >
        <Input
          id="sheet-postal"
          placeholder="e.g. L7A, L6P 2K1"
          autoCapitalize="characters"
          autoComplete="postal-code"
          value={draft.postal}
          aria-invalid={postalError ? true : undefined}
          aria-describedby={postalError ? "sheet-postal-error" : "sheet-postal-hint"}
          onChange={(event) => {
            clearPostalError();
            setDraft((d) => ({ ...d, postal: event.target.value }));
          }}
        />
      </Field>

      <ChipField
        label="Bedrooms"
        value={draft.beds}
        options={BED_OPTIONS}
        suffix="+"
        onChange={(beds) => setDraft((d) => ({ ...d, beds }))}
      />

      <ChipField
        label="Bathrooms"
        value={draft.baths}
        options={BATH_OPTIONS}
        suffix="+"
        onChange={(baths) => setDraft((d) => ({ ...d, baths }))}
      />

      <ChipField
        label="Garages"
        value={draft.garages}
        options={GARAGE_OPTIONS}
        suffix="+"
        onChange={(garages) => setDraft((d) => ({ ...d, garages }))}
      />

      <ChipField
        label="Floors"
        value={draft.floors}
        options={FLOOR_OPTIONS}
        suffix="+"
        onChange={(floors) => setDraft((d) => ({ ...d, floors }))}
      />

      <div className="space-y-1.5">
        <span className="block text-small font-medium text-ink">Basement</span>
        <div className="flex flex-wrap gap-2">
          {BASEMENT_OPTIONS.map((option) => (
            <ChipToggle
              key={option.value || "any"}
              active={draft.basement === option.value}
              onClick={() => setDraft((d) => ({ ...d, basement: option.value }))}
            >
              {option.label}
            </ChipToggle>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="block text-small font-medium text-ink">Property age</span>
        <div className="flex flex-wrap gap-2">
          <ChipToggle
            active={!draft.yearBuiltMin}
            onClick={() => setDraft((d) => ({ ...d, yearBuiltMin: "" }))}
          >
            Any
          </ChipToggle>
          {YEAR_OPTIONS.map((year) => (
            <ChipToggle
              key={year}
              active={draft.yearBuiltMin === String(year)}
              onClick={() =>
                setDraft((d) => ({
                  ...d,
                  yearBuiltMin: d.yearBuiltMin === String(year) ? "" : String(year),
                }))
              }
            >
              {year}+
            </ChipToggle>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChipField({
  label,
  value,
  options,
  suffix = "",
  onChange,
}: {
  label: string;
  value: string;
  options: number[];
  suffix?: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <span className="block text-small font-medium text-ink">{label}</span>
      <div className="flex flex-wrap gap-2">
        <ChipToggle active={!value} onClick={() => onChange("")}>
          Any
        </ChipToggle>
        {options.map((option) => (
          <ChipToggle
            key={option}
            active={value === String(option)}
            onClick={() => onChange(value === String(option) ? "" : String(option))}
          >
            {option}
            {suffix}
          </ChipToggle>
        ))}
      </div>
    </div>
  );
}

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
    case "garages":
      return `${value}+ garage`;
    case "floors":
      return `${value}+ floors`;
    case "basement": {
      const labels: Record<string, string> = {
        yes: "Has basement",
        finished: "Finished basement",
        unfinished: "Unfinished basement",
        apartment: "Basement apartment",
        none: "No basement",
      };
      return labels[value] ?? `Basement: ${value}`;
    }
    case "yearBuiltMin":
      return `Built ${value}+`;
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

function FilterIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 6h16M7 12h10M10 18h4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
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
