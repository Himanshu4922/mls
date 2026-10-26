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
  ChipToggle,
  Field,
  Input,
  NumericInput,
  SearchInput,
  Select,
} from "@/components/ui/Field";
import { AiSearchBox } from "@/components/search/AiSearchBox";
import { SaveSearchButton } from "@/components/search/SaveSearchButton";
import { SideSheet } from "@/components/ui/SideSheet";
import {
  LISTING_SORTS,
  RELEVANCE_SORT,
  SEARCH_PROPERTY_TYPES,
  type ListingQuery,
  type ListingSort,
} from "@/lib/types/domain";
import { formatNumber, formatPrice } from "@/lib/utils/format";
import { formatPostal, looksLikePostal, parsePostalList } from "@/lib/utils/postal";
import { STATUS_TABS } from "@/lib/utils/status";

/**
 * Map search filters — same interaction model as <ListingFilters>.
 *
 * On the bar: keyword search, Buy/Rent, and a Filters button.
 * In a right-side sheet (full-width on phones): AI search, home type, sort,
 * save search, and the detailed filters. Applied pills stay on the bar so the
 * sheet is not the only place to see or clear them.
 *
 * Reads/writes the same ListingQuery URL params as /listings, so a search
 * moves between the two views intact.
 */

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

type OnQueryChange = (next: ListingQuery) => void;

/** Filters drafted in the sheet and applied as one batch. */
interface Draft {
  priceMin: string;
  priceMax: string;
  city: string;
  postal: string;
  beds: string;
  baths: string;
  sqftMin: string;
  sqftMax: string;
  garages: string;
  floors: string;
  basement: string;
  yearBuiltMin: string;
  status: string;
  openHouse: boolean;
}

const EMPTY_DRAFT: Draft = {
  priceMin: "",
  priceMax: "",
  city: "",
  postal: "",
  beds: "",
  baths: "",
  sqftMin: "",
  sqftMax: "",
  garages: "",
  floors: "",
  basement: "",
  yearBuiltMin: "",
  status: "",
  openHouse: false,
};

const str = (value: number | undefined) => (value ? String(value) : "");
const num = (value: string) => (value ? Number(value) : undefined);

function postalDraft(codes: string[] | undefined): string {
  return (codes ?? []).map(formatPostal).join(", ");
}

function draftFromQuery(query: ListingQuery): Draft {
  return {
    priceMin: str(query.priceMin),
    priceMax: str(query.priceMax),
    city: query.city ?? "",
    postal: postalDraft(query.postalCodes),
    beds: str(query.bedsMin),
    baths: str(query.bathsMin),
    sqftMin: str(query.sqftMin),
    sqftMax: str(query.sqftMax),
    garages: str(query.garagesMin),
    floors: str(query.storiesMin),
    basement: query.basement ?? "",
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

/** How many sheet-owned filters are in effect, for the Filters button badge. */
function countSheetFilters(query: ListingQuery): number {
  return [
    query.semantic,
    query.type,
    query.priceMin,
    query.priceMax,
    query.city,
    ...(query.postalCodes ?? []),
    query.bedsMin,
    query.bathsMin,
    query.sqftMin,
    query.sqftMax,
    query.garagesMin,
    query.storiesMin,
    query.basement,
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

export function MapFilters({
  query,
  onChange,
}: {
  query: ListingQuery;
  onChange: OnQueryChange;
}) {
  const [search, setSearch] = useState(query.search ?? "");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFromQuery(query));
  const [postalError, setPostalError] = useState<string | null>(null);

  // Keep the bar search + draft in sync when the URL changes (back/forward,
  // AI search, pill remove).
  const queryKey = [
    query.search,
    query.priceMin,
    query.priceMax,
    query.city,
    query.postalCodes?.join(","),
    query.bedsMin,
    query.bathsMin,
    query.sqftMin,
    query.sqftMax,
    query.garagesMin,
    query.storiesMin,
    query.basement,
    query.yearBuiltMin,
    query.status,
    query.openHouse,
  ].join("|");
  const [lastQueryKey, setLastQueryKey] = useState(queryKey);
  if (queryKey !== lastQueryKey) {
    setLastQueryKey(queryKey);
    setSearch(query.search ?? "");
    setDraft(draftFromQuery(query));
    setPostalError(null);
  }

  const rent = query.transaction === "rent";
  const dirty = !sameDraft(draft, draftFromQuery(query));
  const sheetFilterCount = countSheetFilters(query);
  const pills = appliedPills(query, onChange);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setDraft(draftFromQuery(query));
      setPostalError(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sheetOpen, query]);

  const setRent = (next: boolean) => {
    if (next === rent) return;
    onChange({
      ...query,
      transaction: next ? "rent" : "sale",
      priceMin: undefined,
      priceMax: undefined,
    });
  };

  const submitSearch = (event: FormEvent) => {
    event.preventDefault();
    const term = search.trim();
    if (term && looksLikePostal(term)) {
      const codes = parsePostalList([...(query.postalCodes ?? []), term].join(",")).codes;
      onChange({ ...query, postalCodes: codes.length ? codes : undefined, search: undefined });
      return;
    }
    onChange({ ...query, search: term || undefined });
  };

  const openSheet = () => {
    setDraft(draftFromQuery(query));
    setPostalError(null);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setDraft(draftFromQuery(query));
    setPostalError(null);
    setSheetOpen(false);
  };

  const applySheet = () => {
    const [priceMin, priceMax] = orderedRange(draft.priceMin, draft.priceMax);
    const [sqftMin, sqftMax] = orderedRange(draft.sqftMin, draft.sqftMax);
    const postal = parsePostalList(draft.postal);
    if (postal.invalid.length > 0) {
      setPostalError(
        `Not a valid postal code: ${postal.invalid.join(", ")}. Use L7A or L7A 3K9.`,
      );
      return;
    }
    setPostalError(null);
    onChange({
      ...query,
      priceMin,
      priceMax,
      city: draft.city.trim() || undefined,
      postalCodes: postal.codes.length ? postal.codes : undefined,
      bedsMin: num(draft.beds),
      bathsMin: num(draft.baths),
      sqftMin,
      sqftMax,
      garagesMin: num(draft.garages),
      storiesMin: num(draft.floors),
      basement: (draft.basement || undefined) as ListingQuery["basement"] | undefined,
      yearBuiltMin: num(draft.yearBuiltMin),
      status: draft.status || undefined,
      openHouse: draft.openHouse || undefined,
    });
    setSheetOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <form
          onSubmit={submitSearch}
          className="flex min-w-0 flex-[1_1_100%] items-center gap-2 sm:flex-[1_1_auto]"
        >
          <SearchInput
            label="Search by address, city, postal code or MLS number"
            value={search}
            onValueChange={setSearch}
            placeholder="Address, city, postal or MLS…"
            className="min-w-0 flex-1"
          />
          <Button type="submit" variant="primary" size="md" className="shrink-0">
            Search
          </Button>
        </form>

        <div role="group" aria-label="Buy or rent" className="flex shrink-0 gap-2">
          <ChipToggle active={!rent} onClick={() => setRent(false)}>
            Buy
          </ChipToggle>
          <ChipToggle active={rent} onClick={() => setRent(true)}>
            Rent
          </ChipToggle>
        </div>

        <Button
          variant="secondary"
          size="md"
          aria-expanded={sheetOpen}
          aria-controls="map-filter-sheet"
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

      {pills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-caption text-ink-muted">Applied:</span>
          {pills}
          <button
            type="button"
            onClick={() => onChange(clearedQuery(query))}
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
        <div id="map-filter-sheet" className="space-y-8">
          <section className="space-y-3">
            <AiSearchBox
              variant="panel"
              basePath="/map-search"
              current={query}
              onSearched={closeSheet}
            />
          </section>

          <section className="space-y-3 border-t border-line pt-6">
            <h3 className="text-small font-semibold text-ink">Home type</h3>
            <div className="flex flex-wrap gap-2">
              <ChipToggle
                active={!query.type}
                onClick={() => onChange({ ...query, type: undefined })}
              >
                All
              </ChipToggle>
              {SEARCH_PROPERTY_TYPES.map((type) => (
                <ChipToggle
                  key={type}
                  active={query.type === type}
                  onClick={() =>
                    onChange({ ...query, type: query.type === type ? undefined : type })
                  }
                >
                  {type}
                </ChipToggle>
              ))}
            </div>
          </section>

          <section className="space-y-3 border-t border-line pt-6">
            <Field label="Sort by" htmlFor="map-sheet-sort">
              <Select
                id="map-sheet-sort"
                aria-label="Sort listings"
                value={query.sort ?? (query.semantic ? RELEVANCE_SORT.value : "newest")}
                onChange={(event) =>
                  onChange({ ...query, sort: event.target.value as ListingSort })
                }
              >
                {(query.semantic ? [RELEVANCE_SORT, ...LISTING_SORTS] : LISTING_SORTS).map(
                  (option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ),
                )}
              </Select>
            </Field>
            <SaveSearchButton query={query} className="w-full justify-center" />
          </section>

          <section className="space-y-4 border-t border-line pt-6">
            <div>
              <h3 className="text-small font-semibold text-ink">Details</h3>
              <p className="mt-1 text-caption text-ink-muted">
                {dirty
                  ? "Change as many as you like, then tap Show homes."
                  : "Price, size, parking, basement and more."}
              </p>
            </div>
            <FilterFields
              draft={draft}
              setDraft={setDraft}
              isRent={rent}
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
  const toggle = (
    key: "beds" | "baths" | "garages" | "floors" | "yearBuiltMin" | "status",
    value: string,
  ) => setDraft((d) => ({ ...d, [key]: d[key] === value ? "" : value }));

  return (
    <div className="grid grid-cols-1 gap-4">
      <Field label={isRent ? "Min rent / month" : "Min price"} htmlFor="map-sheet-price-min">
        <NumericInput
          id="map-sheet-price-min"
          min={0}
          max={100000000}
          placeholder="No min"
          value={draft.priceMin}
          onChange={(event) => setDraft((d) => ({ ...d, priceMin: event.target.value }))}
        />
      </Field>

      <Field label={isRent ? "Max rent / month" : "Max price"} htmlFor="map-sheet-price-max">
        <NumericInput
          id="map-sheet-price-max"
          min={0}
          max={100000000}
          placeholder="No max"
          value={draft.priceMax}
          onChange={(event) => setDraft((d) => ({ ...d, priceMax: event.target.value }))}
        />
      </Field>

      <Field label="City" htmlFor="map-sheet-city">
        <Input
          id="map-sheet-city"
          placeholder="e.g. Toronto"
          value={draft.city}
          onChange={(event) => setDraft((d) => ({ ...d, city: event.target.value }))}
        />
      </Field>

      <Field
        label="Postal code"
        htmlFor="map-sheet-postal"
        hint="L7A or L7A 3K9 — separate several with commas"
        error={postalError}
      >
        <Input
          id="map-sheet-postal"
          placeholder="e.g. L7A, L6P 2K1"
          autoCapitalize="characters"
          autoComplete="postal-code"
          value={draft.postal}
          aria-invalid={postalError ? true : undefined}
          aria-describedby={postalError ? "map-sheet-postal-error" : "map-sheet-postal-hint"}
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

      <fieldset>
        <legend className="text-small font-medium text-ink">Size (sq ft)</legend>
        <div className="mt-1.5 grid grid-cols-2 gap-3">
          <NumericInput
            aria-label="Minimum square feet"
            min={0}
            max={100000}
            placeholder="No min"
            value={draft.sqftMin}
            onChange={(event) => setDraft((d) => ({ ...d, sqftMin: event.target.value }))}
          />
          <NumericInput
            aria-label="Maximum square feet"
            min={0}
            max={100000}
            placeholder="No max"
            value={draft.sqftMax}
            onChange={(event) => setDraft((d) => ({ ...d, sqftMax: event.target.value }))}
          />
        </div>
      </fieldset>

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
              onClick={() => toggle("yearBuiltMin", String(year))}
            >
              {year}+
            </ChipToggle>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="block text-small font-medium text-ink">Listing status</span>
        <div className="flex flex-wrap gap-2">
          <ChipToggle active={!draft.status} onClick={() => setDraft((d) => ({ ...d, status: "" }))}>
            All
          </ChipToggle>
          {STATUS_TABS.map((tab) => (
            <ChipToggle
              key={tab.param}
              active={draft.status.toLowerCase() === tab.param.toLowerCase()}
              onClick={() => toggle("status", tab.param)}
            >
              {statusLabel(tab.param, isRent)}
            </ChipToggle>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <span className="block text-small font-medium text-ink">Open house</span>
        <div className="flex flex-wrap gap-2">
          <ChipToggle
            active={draft.openHouse}
            onClick={() => setDraft((d) => ({ ...d, openHouse: !d.openHouse }))}
          >
            Has an upcoming open house
          </ChipToggle>
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

/** Every applied filter the Buy/Rent chips do not already show, each removable. */
function appliedPills(query: ListingQuery, onChange: OnQueryChange): ReactNode[] {
  const pills: ReactNode[] = [];
  const add = (key: string, label: string, next: Partial<ListingQuery>, icon?: ReactNode) =>
    pills.push(
      <FilterPill
        key={key}
        label={label}
        icon={icon}
        onRemove={() => onChange({ ...query, ...next })}
      />,
    );
  const rent = query.transaction === "rent";
  const money = (value: number) => (rent ? `${formatPrice(value)}/mo` : formatPrice(value));

  if (query.semantic) {
    add("ai", `Like: ${query.semantic}`, {
      semantic: undefined,
      sort: query.sort === "relevance" ? "newest" : query.sort,
    });
  }
  if (query.search) add("q", `"${query.search}"`, { search: undefined });
  if (query.type) add("type", query.type, { type: undefined });
  if (query.city) add("city", query.city, { city: undefined });
  for (const code of query.postalCodes ?? []) {
    const rest = query.postalCodes!.filter((c) => c !== code);
    add(`postal-${code}`, formatPostal(code), { postalCodes: rest.length ? rest : undefined }, <PinIcon />);
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
  if (query.garagesMin) add("garages", `${query.garagesMin}+ garage`, { garagesMin: undefined });
  if (query.storiesMin) add("floors", `${query.storiesMin}+ floors`, { storiesMin: undefined });
  if (query.basement) {
    const labels: Record<NonNullable<ListingQuery["basement"]>, string> = {
      yes: "Has basement",
      finished: "Finished basement",
      unfinished: "Unfinished basement",
      apartment: "Basement apartment",
      none: "No basement",
    };
    add("basement", labels[query.basement], { basement: undefined });
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
